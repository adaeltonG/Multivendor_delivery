import { GraphQLScalarType, Kind } from 'graphql'
import { trusted } from 'mongoose'
import {
  Order,
  Restaurant,
  Review,
  Rider,
  User,
  Zone
} from '../../models/index.js'

function jsonLiteral(ast: any): unknown {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value
    case Kind.INT:
    case Kind.FLOAT:
      return Number(ast.value)
    case Kind.NULL:
      return null
    case Kind.LIST:
      return ast.values.map(jsonLiteral)
    case Kind.OBJECT:
      return Object.fromEntries(
        ast.fields.map((field: any) => [field.name.value, jsonLiteral(field.value)])
      )
    default:
      return undefined
  }
}

const DateTime = new GraphQLScalarType({
  name: 'DateTime',
  serialize(value) {
    const date = value instanceof Date ? value : new Date(value as string | number)
    if (Number.isNaN(date.getTime())) return null
    return date.toISOString()
  },
  parseValue(value) {
    return new Date(value as string)
  },
  parseLiteral(ast) {
    return ast.kind === Kind.STRING ? new Date(ast.value) : null
  }
})

const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  serialize: value => value,
  parseValue: value => value,
  parseLiteral: jsonLiteral
})

const hasObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && ('_id' in (value as object) || 'id' in (value as object)))

const idValue = (parent: { _id?: unknown; id?: unknown }) =>
  parent.id?.toString() ?? parent._id?.toString()

export const fieldResolvers = {
  DateTime,
  JSON: JSONScalar,
  Address: {
    id: idValue
  },
  Zone: {
    title: (parent: any) => {
      const title = parent.title ?? parent.name ?? parent._doc?.name
      return typeof title === 'string' && title.trim()
        ? title.trim()
        : `Zone ${idValue(parent)}`
    }
  },
  User: {
    id: idValue,
    password: () => '',
    restaurants: (parent: any) => {
      if (!parent.restaurants?.length) return []
      if (hasObject(parent.restaurants[0])) return parent.restaurants
      return Restaurant.find({ _id: trusted({ $in: parent.restaurants }) })
    }
  },
  Rider: {
    id: idValue,
    password: () => '',
    zone: (parent: any) =>
      hasObject(parent.zone) ? parent.zone : parent.zone ? Zone.findById(parent.zone) : null
  },
  Restaurant: {
    id: idValue,
    username: () => '',
    password: () => '',
    owner: (parent: any) =>
      hasObject(parent.owner) ? parent.owner : parent.owner ? User.findById(parent.owner) : null,
    zone: (parent: any) =>
      hasObject(parent.zone) ? parent.zone : parent.zone ? Zone.findById(parent.zone) : null,
    reviewAverage: (parent: any) => parent.rating ?? 0,
    distanceWithCurrentLocation: () => 0,
    freeDelivery: () => false,
    acceptVouchers: () => false,
    async reviewData(parent: any) {
      const reviews = await Review.find({ restaurant: parent._id, isActive: true }).sort({
        createdAt: -1
      })
      return {
        reviews,
        ratings: parent.rating ?? 0,
        total: parent.reviewCount ?? reviews.length
      }
    }
  },
  RestaurantPreview: {
    reviewAverage: (parent: any) => parent.rating ?? 0,
    username: () => '',
    password: () => ''
  },
  Order: {
    id: idValue,
    user: (parent: any) =>
      hasObject(parent.user) ? parent.user : User.findById(parent.user),
    restaurant: (parent: any) =>
      hasObject(parent.restaurant)
        ? parent.restaurant
        : Restaurant.findById(parent.restaurant),
    rider: (parent: any) =>
      hasObject(parent.rider) ? parent.rider : parent.rider ? Rider.findById(parent.rider) : null,
    zone: (parent: any) =>
      hasObject(parent.zone) ? parent.zone : parent.zone ? Zone.findById(parent.zone) : null,
    review: (parent: any) =>
      hasObject(parent.review)
        ? parent.review
        : parent.review
          ? Review.findById(parent.review)
          : null
  },
  AdminOrder: {
    user: (parent: any) =>
      hasObject(parent.user) ? parent.user : User.findById(parent.user),
    rider: (parent: any) =>
      hasObject(parent.rider) ? parent.rider : parent.rider ? Rider.findById(parent.rider) : null,
    review: (parent: any) =>
      hasObject(parent.review)
        ? parent.review
        : parent.review
          ? Review.findById(parent.review)
          : null
  },
  AdminOrderItem: {
    async food(parent: any) {
      const restaurant = await Restaurant.findOne({ 'categories.foods._id': parent.food }).lean()
      return restaurant?.categories
        .flatMap(category => category.foods)
        .find(food => food._id.equals(parent.food))
    }
  },
  Review: {
    order: (parent: any) =>
      hasObject(parent.order) ? parent.order : Order.findById(parent.order),
    restaurant: (parent: any) =>
      hasObject(parent.restaurant)
        ? parent.restaurant
        : Restaurant.findById(parent.restaurant)
  },
  ChatMessage: {
    id: idValue
  },
  Offer: {
    restaurants: (parent: any) => {
      if (!parent.restaurants?.length) return []
      if (hasObject(parent.restaurants[0])) return parent.restaurants
      return Restaurant.find({ _id: trusted({ $in: parent.restaurants }) })
    }
  },
  Section: {
    restaurants: (parent: any) => {
      if (!parent.restaurants?.length) return []
      if (hasObject(parent.restaurants[0])) return parent.restaurants
      return Restaurant.find({ _id: trusted({ $in: parent.restaurants }) })
    }
  },
  Earning: {
    rider: (parent: any) =>
      hasObject(parent.rider) ? parent.rider : Rider.findById(parent.rider)
  },
  WithdrawRequest: {
    rider: (parent: any) =>
      hasObject(parent.rider) ? parent.rider : Rider.findById(parent.rider)
  }
}
