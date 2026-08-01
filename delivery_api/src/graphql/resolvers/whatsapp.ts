import {
  Restaurant,
  Order,
  WhatsAppConnection,
  WhatsAppConversation,
  WhatsAppMessage
} from '../../models/index.js'
import type { QueryFilter } from 'mongoose'
import type { WhatsAppConversationDocument } from '../../models/index.js'
import type { GraphQLContext } from '../context.js'
import { badUserInput, forbidden, notFound, unauthenticated } from '../../utils/errors.js'
import { encryptSecret } from '../../utils/secret.js'
import {
  publishWhatsAppConversation,
  sendWhatsAppText
} from '../../services/whatsapp.gateway.js'
import {
  createWhatsAppMessageTemplate,
  listWhatsAppMessageTemplates
} from '../../services/whatsapp.templates.js'
import type { WhatsAppTemplateCategory } from '../../services/whatsapp.template-validation.js'
import { env } from '../../config/env.js'
import { pubsub, topics } from '../pubsub.js'

function scopedRestaurantId(context: GraphQLContext, requested?: string): string | undefined {
  if (!context.user) unauthenticated()
  if (context.user.role === 'RESTAURANT') {
    if (!context.user.restaurantId) forbidden()
    if (requested && requested !== context.user.restaurantId) forbidden()
    return context.user.restaurantId
  }
  if (context.user.role !== 'ADMIN') forbidden()
  return requested
}

async function authorizedConversation(id: string, context: GraphQLContext) {
  const conversation = await WhatsAppConversation.findById(id)
  if (!conversation) notFound('WhatsApp conversation')
  const restaurantId = scopedRestaurantId(context)
  if (
    context.user?.role !== 'ADMIN' &&
    conversation.restaurant?.toString() !== restaurantId
  ) {
    forbidden()
  }
  return conversation
}

async function authorizedConnectionId(
  requestedId: string | undefined,
  context: GraphQLContext
): Promise<string> {
  const restaurantId = scopedRestaurantId(context)
  if (context.user?.role === 'ADMIN' && !requestedId) {
    badUserInput('connectionId is required for an admin request')
  }
  const connection = requestedId
    ? await WhatsAppConnection.findById(requestedId)
    : await WhatsAppConnection.findOne({
        restaurant: restaurantId,
        isActive: true
      }).sort({ updatedAt: -1 })
  if (!connection) notFound('WhatsApp connection')
  if (
    context.user?.role === 'RESTAURANT' &&
    connection.restaurant?.toString() !== restaurantId
  ) {
    forbidden()
  }
  return connection.id
}

export const whatsappResolvers = {
  WhatsAppConnection: {
    accessTokenConfigured: (parent: any) =>
      Boolean(parent.accessTokenEncrypted) ||
      Boolean(
        env.WHATSAPP_ACCESS_TOKEN &&
          env.WHATSAPP_PHONE_NUMBER_ID &&
          parent.phoneNumberId === env.WHATSAPP_PHONE_NUMBER_ID
      )
  },
  WhatsAppConversation: {
    restaurant: (parent: any) => parent.restaurant?.toString(),
    connection: (parent: any) => parent.connection?.toString(),
    order: (parent: any) =>
      parent.order && typeof parent.order === 'object' && '_id' in parent.order
        ? parent.order
        : parent.order
          ? Order.findById(parent.order)
          : null
  },
  WhatsAppMessage: {
    conversation: (parent: any) => parent.conversation?.toString()
  },
  Query: {
    whatsappConnections: (
      _parent: unknown,
      { restaurantId }: { restaurantId?: string },
      context: GraphQLContext
    ) => {
      const restaurant = scopedRestaurantId(context, restaurantId)
      return WhatsAppConnection.find({
        ...(restaurant ? { restaurant } : {})
      })
        .select('+accessTokenEncrypted')
        .sort({ createdAt: -1 })
    },
    async whatsappMessageTemplates(
      _parent: unknown,
      { connectionId }: { connectionId?: string },
      context: GraphQLContext
    ) {
      const authorizedId = await authorizedConnectionId(connectionId, context)
      return listWhatsAppMessageTemplates(authorizedId)
    },
    whatsappConversations: (
      _parent: unknown,
      args: {
        restaurantId?: string
        status?: string
        limit?: number
        offset?: number
      },
      context: GraphQLContext
    ) => {
      const restaurant = scopedRestaurantId(context, args.restaurantId)
      const limit = Math.min(100, Math.max(1, args.limit ?? 50))
      return WhatsAppConversation.find({
        purpose: 'ORDERING',
        ...(restaurant ? { restaurant } : {}),
        ...(args.status ? { status: args.status } : {})
      } as QueryFilter<WhatsAppConversationDocument>)
        .sort({ lastMessageAt: -1 })
        .skip(Math.max(0, args.offset ?? 0))
        .limit(limit)
    },
    async whatsappMessages(
      _parent: unknown,
      args: { conversationId: string; limit?: number; before?: Date },
      context: GraphQLContext
    ) {
      await authorizedConversation(args.conversationId, context)
      const messages = await WhatsAppMessage.find({
        conversation: args.conversationId,
        ...(args.before ? { createdAt: { $lt: args.before } } : {})
      })
        .sort({ createdAt: -1 })
        .limit(Math.min(200, Math.max(1, args.limit ?? 100)))
      return messages.reverse()
    }
  },
  Mutation: {
    async createWhatsAppMessageTemplate(
      _parent: unknown,
      args: {
        input: {
          connectionId?: string
          name: string
          category: WhatsAppTemplateCategory
          language: string
          body: string
          exampleValues?: string[]
        }
      },
      context: GraphQLContext
    ) {
      const connectionId = await authorizedConnectionId(
        args.input.connectionId,
        context
      )
      return createWhatsAppMessageTemplate(connectionId, args.input)
    },
    async upsertWhatsAppConnection(
      _parent: unknown,
      args: {
        input: {
          restaurantId?: string
          phoneNumberId: string
          whatsappBusinessAccountId?: string
          displayPhoneNumber?: string
          verifiedName?: string
          accessToken?: string
          isActive?: boolean
        }
      },
      context: GraphQLContext
    ) {
      const restaurantId = scopedRestaurantId(context, args.input.restaurantId)
      if (restaurantId && !(await Restaurant.exists({ _id: restaurantId }))) {
        notFound('Restaurant')
      }
      const update: Record<string, unknown> = {
        ...(restaurantId ? { restaurant: restaurantId } : {}),
        whatsappBusinessAccountId: args.input.whatsappBusinessAccountId ?? '',
        displayPhoneNumber: args.input.displayPhoneNumber ?? '',
        verifiedName: args.input.verifiedName ?? '',
        isActive: args.input.isActive ?? true
      }
      if (args.input.accessToken) {
        update.accessTokenEncrypted = encryptSecret(args.input.accessToken)
      }
      return WhatsAppConnection.findOneAndUpdate(
        { phoneNumberId: args.input.phoneNumberId },
        { $set: update },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ).select('+accessTokenEncrypted')
    },
    async takeOverWhatsAppConversation(
      _parent: unknown,
      { conversationId }: { conversationId: string },
      context: GraphQLContext
    ) {
      const conversation = await authorizedConversation(conversationId, context)
      conversation.status = 'MANUAL'
      conversation.unreadCount = 0
      await conversation.save()
      await publishWhatsAppConversation(conversation)
      return conversation
    },
    async releaseWhatsAppConversationToBot(
      _parent: unknown,
      { conversationId }: { conversationId: string },
      context: GraphQLContext
    ) {
      const conversation = await authorizedConversation(conversationId, context)
      conversation.status = 'BOT'
      conversation.unreadCount = 0
      await conversation.save()
      await publishWhatsAppConversation(conversation)
      await sendWhatsAppText(
        conversation.connection.toString(),
        conversation.customerWaId,
        'Automation is back on. Send MENU to continue ordering or HUMAN for assistance.',
        { conversationId: conversation.id }
      )
      return conversation
    },
    async closeWhatsAppConversation(
      _parent: unknown,
      { conversationId }: { conversationId: string },
      context: GraphQLContext
    ) {
      const conversation = await authorizedConversation(conversationId, context)
      conversation.status = 'CLOSED'
      conversation.unreadCount = 0
      await conversation.save()
      await publishWhatsAppConversation(conversation)
      return conversation
    },
    async markWhatsAppConversationRead(
      _parent: unknown,
      { conversationId }: { conversationId: string },
      context: GraphQLContext
    ) {
      const conversation = await authorizedConversation(conversationId, context)
      conversation.unreadCount = 0
      await conversation.save()
      await publishWhatsAppConversation(conversation)
      return conversation
    },
    async sendWhatsAppInboxMessage(
      _parent: unknown,
      { conversationId, text }: { conversationId: string; text: string },
      context: GraphQLContext
    ) {
      const value = text.trim()
      if (!value || value.length > 4096) {
        badUserInput('Message must contain between 1 and 4096 characters')
      }
      const conversation = await authorizedConversation(conversationId, context)
      if (conversation.status === 'CLOSED') {
        badUserInput('Reopen the conversation before sending a message')
      }
      if (conversation.status !== 'MANUAL') {
        conversation.status = 'MANUAL'
        conversation.unreadCount = 0
        await conversation.save()
        await publishWhatsAppConversation(conversation)
      }
      return sendWhatsAppText(
        conversation.connection.toString(),
        conversation.customerWaId,
        value,
        { conversationId: conversation.id }
      )
    }
  },
  Subscription: {
    whatsappMessageAdded: {
      subscribe: (
        _parent: unknown,
        { restaurantId }: { restaurantId?: string },
        context: GraphQLContext
      ) => {
        const restaurant = scopedRestaurantId(context, restaurantId)
        if (!restaurant) {
          badUserInput('restaurantId is required for an admin subscription')
        }
        return pubsub.asyncIterableIterator(topics.whatsappMessage(restaurant!))
      }
    },
    whatsappConversationUpdated: {
      subscribe: (
        _parent: unknown,
        { restaurantId }: { restaurantId?: string },
        context: GraphQLContext
      ) => {
        const restaurant = scopedRestaurantId(context, restaurantId)
        if (!restaurant) {
          badUserInput('restaurantId is required for an admin subscription')
        }
        return pubsub.asyncIterableIterator(topics.whatsappConversation(restaurant!))
      }
    }
  }
}
