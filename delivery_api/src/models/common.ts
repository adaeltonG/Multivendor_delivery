import { Schema } from 'mongoose'

export type Coordinates = [number, number]

export const pointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: {
      type: [Number],
      required: true,
      default: [0, 0],
      validate: {
        validator(value: number[]) {
          return (
            value.length === 2 &&
            value[0] !== undefined &&
            value[1] !== undefined &&
            value[0] >= -180 &&
            value[0] <= 180 &&
            value[1] >= -90 &&
            value[1] <= 90
          )
        },
        message: 'GeoJSON coordinates must be [longitude, latitude]'
      }
    }
  },
  { _id: false }
)

export const polygonSchema = new Schema(
  {
    type: { type: String, enum: ['Polygon'], default: 'Polygon' },
    coordinates: { type: [[[Number]]], default: [] }
  },
  { _id: false }
)

export const addressSchema = new Schema(
  {
    label: { type: String, trim: true, default: 'Home' },
    deliveryAddress: { type: String, trim: true, required: true },
    details: { type: String, trim: true, default: '' },
    selected: { type: Boolean, default: false },
    location: { type: pointSchema, required: true },
    id: { type: String }
  },
  { timestamps: true }
)
