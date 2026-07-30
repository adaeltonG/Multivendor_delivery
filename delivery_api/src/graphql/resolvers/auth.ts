import { GraphQLError } from 'graphql'
import { trusted } from 'mongoose'
import { Restaurant, Rider, User } from '../../models/index.js'
import type { GraphQLContext, UserRole } from '../context.js'
import {
  comparePassword,
  hashPassword,
  signToken
} from '../../utils/auth.js'
import {
  badUserInput,
  forbidden,
  notFound,
  unauthenticated
} from '../../utils/errors.js'
import { verifyGoogleIdToken } from '../../services/google-auth.js'

type LoginArgs = {
  email?: string
  password?: string
  type: string
  appleId?: string
  googleIdToken?: string
  name?: string
  notificationToken?: string
}

function authResponse(
  record: any,
  role: UserRole,
  extra: { restaurantId?: string; riderId?: string; restaurants?: unknown[] } = {}
) {
  return {
    userId: record.id,
    token: signToken({
      sub: record.id,
      role,
      restaurantId: extra.restaurantId,
      riderId: extra.riderId
    }),
    tokenExpiration: '7d',
    isActive: record.isActive ?? true,
    name: record.name,
    email: record.email,
    phone: record.phone,
    userType: role,
    restaurants: extra.restaurants
  }
}

export const authResolvers = {
  Mutation: {
    async createUser(_parent: unknown, { userInput }: { userInput: Record<string, string> }) {
      if (!userInput.email && !userInput.phone && !userInput.appleId) {
        badUserInput('Email, phone, or Apple ID is required')
      }
      if (!userInput.password && !userInput.appleId) {
        badUserInput('Password is required')
      }
      const existing = await User.findOne({
        $or: [
          ...(userInput.email ? [{ email: userInput.email.toLowerCase() }] : []),
          ...(userInput.phone ? [{ phone: userInput.phone }] : []),
          ...(userInput.appleId ? [{ appleId: userInput.appleId }] : [])
        ]
      })
      if (existing) {
        throw new GraphQLError('An account with these details already exists', {
          extensions: { code: 'CONFLICT' }
        })
      }
      const user = await User.create({
        ...userInput,
        name: userInput.name || 'Customer',
        email: userInput.email?.toLowerCase(),
        password: userInput.password
          ? await hashPassword(userInput.password)
          : undefined,
        userType: 'CUSTOMER'
      })
      return authResponse(user, 'CUSTOMER')
    },

    async login(_parent: unknown, args: LoginArgs) {
      let user
      let isNewUser = false
      if (args.type === 'google') {
        if (!args.googleIdToken) {
          badUserInput('Google identity token is required')
        }

        let identity
        try {
          identity = await verifyGoogleIdToken(args.googleIdToken)
        } catch {
          unauthenticated('Invalid Google identity token')
        }

        user = await User.findOne({
          googleId: identity.subject,
          userType: 'CUSTOMER'
        }).select('+googleId')

        if (!user) {
          user = await User.findOne({
            email: identity.email,
            userType: 'CUSTOMER'
          }).select('+googleId')
        }

        if (!user) {
          user = await User.create({
            googleId: identity.subject,
            email: identity.email,
            name: identity.name,
            emailIsVerified: true,
            notificationToken: args.notificationToken ?? '',
            userType: 'CUSTOMER'
          })
          isNewUser = true
        } else {
          user.googleId = identity.subject
          user.emailIsVerified = true
          if (!user.name) user.name = identity.name
          await user.save()
        }
      } else if (args.appleId) {
        user = await User.findOne({ appleId: args.appleId }).select('+appleId')
        if (!user) {
          user = await User.create({
            appleId: args.appleId,
            email: args.email?.toLowerCase(),
            name: args.name || 'Customer',
            notificationToken: args.notificationToken ?? '',
            userType: 'CUSTOMER'
          })
          isNewUser = true
        }
      } else {
        if (!args.email || !args.password) badUserInput('Email and password are required')
        user = await User.findOne({ email: args.email.toLowerCase() }).select('+password')
        if (!user?.password || !(await comparePassword(args.password, String(user.password)))) {
          unauthenticated('Invalid email or password')
        }
      }
      if (!user.isActive) forbidden('This account is deactivated')
      if (args.notificationToken) {
        user.notificationToken = args.notificationToken
        await user.save()
      }
      return { ...authResponse(user, 'CUSTOMER'), isNewUser }
    },

    async riderLogin(
      _parent: unknown,
      args: { username?: string; password?: string; notificationToken?: string }
    ) {
      if (!args.username || !args.password) badUserInput('Username and password are required')
      const identity = args.username.trim().toLowerCase()
      const rider = await Rider.findOne({
        $or: [{ username: identity }, { email: identity }],
        isActive: true
      }).select('+password')
      if (!rider || !(await comparePassword(args.password, String(rider.password)))) {
        unauthenticated('Invalid username or password')
      }
      if (args.notificationToken) {
        rider.notificationToken = args.notificationToken
        await rider.save()
      }
      return authResponse(rider, 'RIDER', { riderId: rider.id })
    },

    async restaurantLogin(
      _parent: unknown,
      args: { username: string; password: string }
    ) {
      const restaurant = await Restaurant.findOne({
        username: args.username.toLowerCase(),
        isActive: true
      }).select('+username +password')
      if (!restaurant || !(await comparePassword(args.password, String(restaurant.password)))) {
        unauthenticated('Invalid username or password')
      }
      return {
        ...authResponse(restaurant, 'RESTAURANT', { restaurantId: restaurant.id }),
        restaurantId: restaurant.id
      }
    },

    async ownerLogin(_parent: unknown, args: { email: string; password: string }) {
      const owner = await User.findOne({
        email: args.email.toLowerCase(),
        userType: trusted({ $in: ['VENDOR', 'ADMIN'] })
      })
        .select('+password')
        .populate('restaurants')
      if (!owner?.password || !(await comparePassword(args.password, String(owner.password)))) {
        unauthenticated('Invalid email or password')
      }
      const role = owner.userType as 'VENDOR' | 'ADMIN'
      return authResponse(owner, role, {
        restaurants: owner.restaurants as unknown[]
      })
    },

    async changePassword(
      _parent: unknown,
      args: { oldPassword: string; newPassword: string },
      context: GraphQLContext
    ) {
      if (!context.user) unauthenticated()
      if (context.user.role !== 'CUSTOMER') forbidden()
      const user = await User.findById(context.user.id).select('+password')
      if (!user?.password || !(await comparePassword(args.oldPassword, String(user.password)))) {
        badUserInput('Current password is incorrect')
      }
      user.password = await hashPassword(args.newPassword)
      await user.save()
      return true
    },

    async vendorResetPassword(
      _parent: unknown,
      args: { oldPassword: string; newPassword: string },
      context: GraphQLContext
    ) {
      if (!context.user || !['VENDOR', 'ADMIN'].includes(context.user.role)) {
        unauthenticated()
      }
      const user = await User.findById(context.user.id).select('+password')
      if (!user?.password || !(await comparePassword(args.oldPassword, String(user.password)))) {
        badUserInput('Current password is incorrect')
      }
      user.password = await hashPassword(args.newPassword)
      await user.save()
      return true
    },

    async resetPassword(
      _parent: unknown,
      args: { password: string; email?: string; token?: string }
    ) {
      // Email reset links should exchange a signed, single-use token in production.
      const email = args.email ?? (args.token ? undefined : null)
      if (!email) badUserInput('A verified reset email is required')
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password')
      if (!user) notFound('User')
      user.password = await hashPassword(args.password)
      await user.save()
      return { result: true }
    },

    async forgotPassword(_parent: unknown, args: { email: string }) {
      const exists = await User.exists({ email: args.email.toLowerCase() })
      return { result: Boolean(exists) }
    },
    sendOtpToEmail: () => ({ result: true }),
    sendOtpToPhoneNumber: () => ({ result: true }),
    emailExist: (_parent: unknown, args: { email: string }) =>
      User.findOne({ email: args.email.toLowerCase() }).exec(),
    phoneExist: (_parent: unknown, args: { phone: string }) =>
      User.findOne({ phone: args.phone }).exec()
  }
}
