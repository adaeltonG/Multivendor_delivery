import { gql } from '@apollo/client'

export const RESTAURANT_LOGIN = gql`
  mutation RestaurantLogin($username: String!, $password: String!) {
    restaurantLogin(username: $username, password: $password) {
      token
      restaurantId
    }
  }
`

export const RESTAURANT_STATUS = gql`
  query RestaurantStatus($id: String!) {
    restaurant(id: $id) {
      _id
      name
      isAvailable
    }
  }
`

export const TOGGLE_RESTAURANT_AVAILABILITY = gql`
  mutation ToggleRestaurantAvailability {
    toggleAvailability {
      _id
      name
      isAvailable
    }
  }
`

export const CONVERSATIONS = gql`
  query WhatsAppConversations(
    $status: WhatsAppConversationStatus
    $limit: Int
    $offset: Int
  ) {
    whatsappConversations(status: $status, limit: $limit, offset: $offset) {
      _id
      restaurant
      customerWaId
      customerName
      status
      botState
      unreadCount
      lastMessagePreview
      lastMessageAt
      order {
        _id
        orderId
        orderStatus
        orderAmount
      }
      cart {
        foodId
        variationId
        title
        quantity
        unitPrice
      }
      createdAt
      updatedAt
    }
  }
`

export const MESSAGES = gql`
  query WhatsAppMessages($conversationId: ID!, $limit: Int, $before: DateTime) {
    whatsappMessages(conversationId: $conversationId, limit: $limit, before: $before) {
      _id
      direction
      type
      text
      status
      metaMessageId
      createdAt
    }
  }
`

export const TAKE_OVER = gql`
  mutation TakeOver($conversationId: ID!) {
    takeOverWhatsAppConversation(conversationId: $conversationId) {
      _id
      status
      botState
    }
  }
`

export const RELEASE = gql`
  mutation Release($conversationId: ID!) {
    releaseWhatsAppConversationToBot(conversationId: $conversationId) {
      _id
      status
      botState
    }
  }
`

export const CLOSE = gql`
  mutation Close($conversationId: ID!) {
    closeWhatsAppConversation(conversationId: $conversationId) {
      _id
      status
    }
  }
`

export const MARK_READ = gql`
  mutation MarkWhatsAppConversationRead($conversationId: ID!) {
    markWhatsAppConversationRead(conversationId: $conversationId) {
      _id
      unreadCount
      updatedAt
    }
  }
`

export const SEND = gql`
  mutation Send($conversationId: ID!, $text: String!) {
    sendWhatsAppInboxMessage(conversationId: $conversationId, text: $text) {
      _id
      direction
      type
      text
      status
      metaMessageId
      createdAt
    }
  }
`

export const MESSAGE_ADDED = gql`
  subscription WhatsAppMessageAdded {
    whatsappMessageAdded {
      _id
      conversation
      direction
      type
      text
      status
      metaMessageId
      createdAt
    }
  }
`

export const CONVERSATION_UPDATED = gql`
  subscription WhatsAppConversationUpdated {
    whatsappConversationUpdated {
      _id
      restaurant
      customerWaId
      customerName
      status
      botState
      unreadCount
      lastMessagePreview
      lastMessageAt
      updatedAt
    }
  }
`
