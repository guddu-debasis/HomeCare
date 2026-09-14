import { pgTable, serial, bigint, varchar, decimal, timestamp, date, integer, pgEnum } from 'drizzle-orm/pg-core';

// Enums
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'failed', 'refunded']);
export const bookingStatusEnum = pgEnum('booking_status', ['pending', 'accepted', 'completed', 'cancelled']);

// Customers Table
export const customers = pgTable('Customers', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull(),
  dob: date('DOB'),
  password: varchar('password', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phNo: varchar('ph_no', { length: 50 }),
  currLocation: varchar('curr_location', { length: 255 }),
  verificationToken: varchar('verification_token', { length: 255 }),
  refreshToken: varchar('refresh_token', { length: 255 }),
  resetPasswordToken: varchar('reset_password_token', { length: 255 }),
  resetPasswordExpires: timestamp('reset_password_expires'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Admin Table
export const admin = pgTable('Admin', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  dob: date('DOB'),
  phNo: varchar('ph_no', { length: 50 }),
  verificationToken: varchar('verification_token', { length: 255 }),
  refreshToken: varchar('refresh_token', { length: 255 }),
  resetPasswordToken: varchar('reset_password_token', { length: 255 }),
  resetPasswordExpires: timestamp('reset_password_expires'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Seller Table
export const seller = pgTable('Seller', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  dob: date('DOB'),
  phNo: varchar('ph_no', { length: 50 }),
  verificationToken: varchar('verification_token', { length: 255 }),
  refreshToken: varchar('refresh_token', { length: 255 }),
  resetPasswordToken: varchar('reset_password_token', { length: 255 }),
  resetPasswordExpires: timestamp('reset_password_expires'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Service Table
export const service = pgTable('Service', {
  id: serial('id').primaryKey(),
  serviceName: varchar('service_name', { length: 255 }).notNull(),
  basePrice: decimal('base_price', { precision: 10, scale: 2 }).notNull(),
  description: varchar('description', { length: 500 }),
});

// Seller_Service Junction Table
export const sellerService = pgTable('Seller_Service', {
  id: serial('id').primaryKey(),
  sellerId: integer('seller_id').notNull().references(() => seller.id, { onDelete: 'cascade' }),
  serviceId: integer('service_id').notNull().references(() => service.id, { onDelete: 'cascade' }),
  customPrice: decimal('custom_price', { precision: 10, scale: 2 }),
  description: varchar('description', { length: 1000 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Cart_Items Table
export const cartItems = pgTable('Cart_Items', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  serviceId: integer('service_id').notNull().references(() => service.id, { onDelete: 'cascade' }),
  sellerId: integer('seller_id').notNull().references(() => seller.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull().default(1),
  createdAt: timestamp('createdAt').defaultNow(),
});

// Order/Booking Table
export const orderBooking = pgTable('Order/Booking', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  paymentStatus: paymentStatusEnum('payment_status').notNull().default('pending'),
  status: bookingStatusEnum('status').notNull().default('pending'),
  bookingDate: date('booking_date').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
});

// Order_Items Table
export const orderItems = pgTable('Order_Items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orderBooking.id, { onDelete: 'cascade' }),
  serviceId: integer('service_id').notNull().references(() => service.id, { onDelete: 'restrict' }),
  sellerId: integer('seller_id').notNull().references(() => seller.id, { onDelete: 'restrict' }),
  quantity: integer('quantity').notNull().default(1),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
});

// Ratings Table
export const ratings = pgTable('Ratings', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').notNull().references(() => orderBooking.id, { onDelete: 'cascade' }),
  customerId: integer('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  sellerId: integer('seller_id').notNull().references(() => seller.id, { onDelete: 'cascade' }),
  ratingScore: integer('rating_score').notNull(),
  comment: varchar('comment', { length: 500 }),
  createdAt: timestamp('createdAt').defaultNow(),
});