export const typeDefs = `#graphql
  scalar DateTime
  scalar JSON
  directive @client on FIELD

  type Point {
    type: String
    coordinates: [Float!]!
  }

  type Polygon {
    type: String
    coordinates: JSON
  }

  type Address {
    _id: ID!
    id: ID
    label: String
    deliveryAddress: String!
    details: String
    selected: Boolean
    location: Point!
  }

  type User {
    _id: ID!
    id: ID!
    name: String!
    email: String
    phone: String
    password: String
    userType: String!
    phoneIsVerified: Boolean!
    emailIsVerified: Boolean!
    notificationToken: String
    pushToken: String
    isActive: Boolean!
    isOrderNotification: Boolean!
    isOfferNotification: Boolean!
    addresses: [Address!]!
    favourite: [ID!]!
    restaurants: [Restaurant!]!
    createdAt: DateTime
    updatedAt: DateTime
  }

  type AuthData {
    userId: ID!
    token: String!
    tokenExpiration: String!
    isActive: Boolean
    name: String
    email: String
    phone: String
    userType: String
    isNewUser: Boolean
    restaurantId: ID
    restaurants: [Restaurant!]
  }

  type Result {
    result: Boolean!
  }

  type ActionResult {
    success: Boolean!
    message: String!
  }

  type TimeRange {
    startTime: String!
    endTime: String!
  }

  type OpeningTime {
    day: String!
    times: [TimeRange!]!
  }

  type Variation {
    _id: ID!
    title: String!
    price: Float!
    discounted: Float
    addons: [ID!]!
    createdAt: DateTime
    updatedAt: DateTime
  }

  type Food {
    _id: ID!
    title: String!
    description: String
    image: String
    variations: [Variation!]!
    isActive: Boolean!
    createdAt: DateTime
    updatedAt: DateTime
  }

  type Category {
    _id: ID!
    title: String!
    foods: [Food!]!
    createdAt: DateTime
    updatedAt: DateTime
  }

  type Option {
    _id: ID!
    title: String!
    description: String
    price: Float!
  }

  type RestaurantAddon {
    _id: ID!
    options: [ID!]!
    title: String!
    description: String
    quantityMinimum: Int!
    quantityMaximum: Int!
  }

  type CatalogAddon {
    _id: ID!
    options: [Option!]!
    title: String!
    description: String
    quantityMinimum: Int!
    quantityMaximum: Int!
  }

  type ReviewData {
    reviews: [Review!]!
    ratings: Float!
    total: Int!
  }

  type Restaurant {
    _id: ID!
    id: ID!
    orderId: String
    orderPrefix: String
    name: String!
    slug: String
    image: String
    logo: String
    address: String!
    postCode: String
    city: String
    location: Point!
    deliveryBounds: Polygon
    owner: User
    zone: Zone
    username: String
    password: String
    deliveryTime: Float
    minimumOrder: Float
    categories: [Category!]!
    options: [Option!]!
    addons: [RestaurantAddon!]!
    openingTimes: [OpeningTime!]!
    sections: [ID!]!
    cuisines: [String!]!
    keywords: [String!]!
    tags: [String!]!
    rating: Float!
    reviewCount: Int!
    reviewAverage: Float!
    reviewData: ReviewData!
    distanceWithCurrentLocation: Float
    freeDelivery: Boolean
    acceptVouchers: Boolean
    isActive: Boolean!
    isAvailable: Boolean!
    stripeDetailsSubmitted: Boolean!
    commissionRate: Float!
    tax: Float!
    notificationToken: String
    enableNotification: Boolean!
    shopType: String
    createdAt: DateTime
    updatedAt: DateTime
  }

  type RestaurantPreview {
    _id: ID!
    orderId: String
    orderPrefix: String
    name: String!
    slug: String
    image: String
    address: String!
    username: String
    password: String
    deliveryTime: Float
    minimumOrder: Float
    sections: [ID!]!
    rating: Float!
    isActive: Boolean!
    isAvailable: Boolean!
    stripeDetailsSubmitted: Boolean!
    commissionRate: Float!
    tax: Float!
    notificationToken: String
    enableNotification: Boolean!
    shopType: String
    cuisines: [String!]!
    keywords: [String!]!
    tags: [String!]!
    reviewCount: Int!
    reviewAverage: Float!
    openingTimes: [OpeningTime!]!
  }

  type NearbyOffer {
    _id: ID!
    name: String!
    tag: String
    restaurants: [ID!]!
  }

  type NearbySection {
    _id: ID!
    name: String!
    restaurants: [ID!]!
  }

  type NearbyRestaurants {
    offers: [NearbyOffer!]!
    sections: [NearbySection!]!
    restaurants: [Restaurant!]!
  }

  type NearbyRestaurantPreviews {
    offers: [NearbyOffer!]!
    sections: [NearbySection!]!
    restaurants: [RestaurantPreview!]!
  }

  type Zone {
    _id: ID!
    title: String!
    tax: Float
    description: String
    location: Polygon!
    isActive: Boolean!
  }

  type Rider {
    _id: ID!
    id: ID!
    name: String!
    email: String
    username: String!
    password: String
    phone: String!
    image: String
    available: Boolean!
    isActive: Boolean!
    location: Point!
    zone: Zone
    accountNumber: String
    currentWalletAmount: Float!
    totalWalletAmount: Float!
    withdrawnWalletAmount: Float!
    createdAt: DateTime
    updatedAt: DateTime
  }

  type OrderVariation {
    _id: ID!
    title: String!
    price: Float!
    discounted: Float
  }

  type OrderOption {
    _id: ID!
    title: String!
    description: String
    price: Float!
  }

  type OrderAddon {
    _id: ID!
    options: [OrderOption!]!
    title: String!
    description: String
    quantityMinimum: Int!
    quantityMaximum: Int!
  }

  type OrderItem {
    _id: ID!
    title: String!
    food: ID!
    description: String
    image: String
    quantity: Int!
    variation: OrderVariation!
    addons: [OrderAddon!]!
    specialInstructions: String
    isActive: Boolean!
    createdAt: DateTime
    updatedAt: DateTime
  }

  type AdminOrderItem {
    _id: ID!
    food: Food
    variation: OrderVariation!
    addons: [OrderAddon!]!
    specialInstructions: String
    quantity: Int!
  }

  type Order {
    _id: ID!
    id: ID!
    orderId: String!
    user: User!
    restaurant: Restaurant!
    rider: Rider
    zone: Zone
    items: [OrderItem!]!
    deliveryAddress: Address!
    paymentMethod: String!
    paidAmount: Float!
    orderAmount: Float!
    deliveryCharges: Float!
    tipping: Float!
    taxationAmount: Float!
    status: Boolean!
    paymentStatus: String!
    orderStatus: String!
    reason: String
    isActive: Boolean!
    orderDate: DateTime
    expectedTime: DateTime
    completionTime: DateTime
    preparationTime: String
    isPickedUp: Boolean!
    instructions: String
    isRinged: Boolean!
    isRiderRinged: Boolean!
    acceptedAt: DateTime
    pickedAt: DateTime
    deliveredAt: DateTime
    cancelledAt: DateTime
    assignedAt: DateTime
    review: Review
    createdAt: DateTime
    updatedAt: DateTime
  }

  type AdminOrder {
    _id: ID!
    deliveryAddress: JSON!
    deliveryCharges: Float!
    orderAmount: Float!
    paidAmount: Float!
    paymentMethod: String!
    orderId: String!
    user: User!
    items: [AdminOrderItem!]!
    reason: String
    status: Boolean!
    paymentStatus: String!
    orderStatus: String!
    createdAt: DateTime
    review: Review
    rider: Rider
  }

  type Review {
    _id: ID!
    order: Order!
    restaurant: Restaurant!
    rating: Int!
    description: String
    isActive: Boolean!
    createdAt: DateTime
    updatedAt: DateTime
  }

  type ChatUser {
    id: ID!
    name: String!
  }

  type ChatMessage {
    id: ID!
    message: String!
    user: ChatUser!
    createdAt: DateTime!
  }

  type ChatResult {
    success: Boolean!
    message: String!
    data: ChatMessage
  }

  type Configuration {
    _id: ID!
    currency: String
    currencySymbol: String
    deliveryRate: Float
    costType: String
    isPaidVersion: Boolean
    skipEmailVerification: Boolean
    skipMobileVerification: Boolean
    testOtp: String
    termsAndConditions: String
    privacyPolicy: String
    email: String
    emailName: String
    password: String
    enableEmail: Boolean
    formEmail: String
    sendGridApiKey: String
    sendGridEnabled: Boolean
    sendGridEmail: String
    sendGridEmailName: String
    sendGridPassword: String
    clientId: String
    clientSecret: String
    sandbox: Boolean
    publishableKey: String
    secretKey: String
    twilioAccountSid: String
    twilioAuthToken: String
    twilioPhoneNumber: String
    twilioEnabled: Boolean
    dashboardSentryUrl: String
    webSentryUrl: String
    apiSentryUrl: String
    customerAppSentryUrl: String
    restaurantAppSentryUrl: String
    riderAppSentryUrl: String
    googleApiKey: String
    cloudinaryUploadUrl: String
    cloudinaryApiKey: String
    webAmplitudeApiKey: String
    appAmplitudeApiKey: String
    webClientID: String
    androidClientID: String
    iOSClientID: String
    expoClientID: String
    googleMapLibraries: String
    googleColor: String
    serverUrlWeb: String
    wsServerUrlWeb: String
    firebaseKey: String
    authDomain: String
    projectId: String
    storageBucket: String
    msgSenderId: String
    appId: String
    measurementId: String
    vapidKey: String
  }

  type Cuisine {
    _id: ID!
    name: String!
    description: String
    image: String
    shopType: String
  }

  type Coupon {
    _id: ID!
    title: String!
    discount: Float!
    enabled: Boolean!
  }

  type CouponPage {
    coupons: [Coupon!]!
    totalCount: Int!
  }

  type Banner {
    _id: ID!
    title: String!
    description: String
    action: String
    screen: String
    file: String
    parameters: String
  }

  type Offer {
    _id: ID!
    name: String!
    tag: String
    restaurants: [Restaurant!]!
  }

  type Section {
    _id: ID!
    name: String!
    enabled: Boolean!
    restaurants: [Restaurant!]!
  }

  type Taxation {
    _id: ID!
    taxationCharges: Float!
    enabled: Boolean!
  }

  type Tipping {
    _id: ID!
    tipVariations: [Float!]!
    enabled: Boolean!
  }

  type Earning {
    _id: ID!
    rider: Rider!
    orderId: String!
    deliveryFee: Float!
    orderStatus: String!
    paymentMethod: String!
    deliveryTime: String
  }

  type WithdrawRequest {
    _id: ID!
    requestId: String!
    requestAmount: Float!
    requestTime: DateTime!
    rider: Rider!
    status: String!
  }

  type Pagination {
    total: Int!
  }

  type WithdrawRequestList {
    success: Boolean!
    message: String!
    data: [WithdrawRequest!]!
    pagination: Pagination!
  }

  type WithdrawUpdateData {
    rider: Rider!
    withdrawRequest: WithdrawRequest!
  }

  type WithdrawUpdateResult {
    success: Boolean!
    message: String!
    data: WithdrawUpdateData
  }

  type ActiveOrderPage {
    orders: [Order!]!
    orderCount: Int!
    page: Int!
    rowsPerPage: Int!
  }

  type DashboardTotal {
    totalOrders: Int!
    totalSales: Float!
  }

  type DashboardPoint {
    day: String!
    count: Int
    amount: Float
  }

  type DashboardSeries {
    orders: [DashboardPoint!]!
  }

  type DashboardData {
    totalOrders: Int!
    totalUsers: Int!
    totalSales: Float!
    orders: [DashboardPoint!]!
  }

  type CashOrderSummary {
    totalAmountCashOnDelivery: Float!
    countCashOnDeliveryOrders: Int!
  }

  type PopularItem {
    id: ID!
    count: Int!
  }

  type Country {
    cities: [City!]!
  }

  type City {
    id: ID!
    name: String!
    latitude: Float!
    longitude: Float!
  }

  type LastOrderCreds {
    riderUsername: String
    riderPassword: String
    restaurantUsername: String
    restaurantPassword: String
  }

  type OrderEvent {
    userId: ID
    zoneId: ID
    origin: String!
    order: Order!
  }

  type DeliveryBoundsResult {
    success: Boolean!
    message: String!
    data: Restaurant
  }

  input CoordinatesInput {
    latitude: Float
    longitude: Float
    coordinates: [Float!]
  }

  input AddressInput {
    _id: ID
    id: ID
    label: String
    deliveryAddress: String!
    details: String
    longitude: String
    latitude: String
    selected: Boolean
  }

  input UserInput {
    name: String
    email: String
    phone: String
    password: String
    notificationToken: String
    appleId: String
  }

  input UpdateUserInput {
    name: String
    phone: String
    phoneIsVerified: Boolean
    emailIsVerified: Boolean
  }

  input OrderAddonInput {
    _id: ID!
    options: [ID!]!
  }

  input OrderInput {
    food: ID!
    quantity: Int!
    variation: ID!
    addons: [OrderAddonInput!]
    specialInstructions: String
  }

  input ChatMessageInput {
    message: String!
  }

  input ReviewInput {
    order: String!
    rating: Int!
    description: String
  }

  input VariationInput {
    _id: ID
    title: String!
    price: Float!
    discounted: Float
    addons: [ID!]
  }

  input FoodInput {
    _id: ID
    restaurant: ID!
    category: ID!
    title: String!
    description: String
    image: String
    variations: [VariationInput!]!
  }

  input CategoryInput {
    _id: ID
    title: String!
    restaurant: ID!
  }

  input OptionValueInput {
    _id: ID
    title: String!
    description: String
    price: Float!
  }

  input CreateOptionInput {
    restaurant: ID!
    options: [OptionValueInput!]!
  }

  input editOptionInput {
    restaurant: ID!
    options: OptionValueInput!
  }

  input AddonValueInput {
    _id: ID
    title: String!
    description: String
    options: [ID!]!
    quantityMinimum: Int!
    quantityMaximum: Int!
  }

  input AddonInput {
    restaurant: ID!
    addons: [AddonValueInput!]!
  }

  input editAddonInput {
    restaurant: ID!
    addons: AddonValueInput!
  }

  input RiderInput {
    _id: ID
    name: String!
    email: String
    username: String!
    password: String
    phone: String!
    zone: ID
    available: Boolean
    accountNumber: String
  }

  input EarningsInput {
    rider: ID
    orderId: String!
    deliveryFee: Float!
    orderStatus: String!
    paymentMethod: String!
    deliveryTime: String
  }

  input CouponInput {
    _id: ID
    title: String!
    discount: Float!
    enabled: Boolean!
  }

  input CuisineInput {
    _id: ID
    name: String!
    description: String
    image: String
    shopType: String
  }

  input BannerInput {
    _id: ID
    title: String!
    description: String
    action: String
    screen: String
    file: String
    parameters: String
  }

  input OfferInput {
    _id: ID
    name: String!
    tag: String
    restaurants: [ID!]
  }

  input SectionInput {
    _id: ID
    name: String!
    enabled: Boolean
    restaurants: [ID!]
  }

  input TippingInput {
    _id: ID
    tipVariations: [Float!]!
    enabled: Boolean!
  }

  input TaxationInput {
    _id: ID
    taxationCharges: Float!
    enabled: Boolean!
  }

  input VendorInput {
    _id: ID
    email: String!
    password: String
  }

  input RestaurantInput {
    name: String!
    address: String!
    image: String
    logo: String
    deliveryTime: Float
    minimumOrder: Float
    username: String!
    password: String!
    shopType: String
    cuisines: [String!]
  }

  input RestaurantProfileInput {
    _id: ID!
    name: String
    address: String
    image: String
    logo: String
    orderPrefix: String
    deliveryTime: Float
    minimumOrder: Float
    username: String
    password: String
    salesTax: Float
    tax: Float
    shopType: String
    cuisines: [String!]
  }

  input TimeRangeInput {
    startTime: String!
    endTime: String!
  }

  input TimingsInput {
    day: String!
    times: [TimeRangeInput!]!
  }

  input ZoneInput {
    _id: ID
    title: String!
    description: String
    coordinates: JSON!
  }

  input CircleBoundsInput {
    latitude: Float
    longitude: Float
    radius: Float!
  }

  input EmailConfigurationInput {
    email: String
    emailName: String
    password: String
    enableEmail: Boolean
  }

  input FormEmailConfigurationInput { formEmail: String }
  input SendGridConfigurationInput {
    sendGridApiKey: String
    sendGridEnabled: Boolean
    sendGridEmail: String
    sendGridEmailName: String
    sendGridPassword: String
  }
  input FirebaseConfigurationInput {
    firebaseKey: String
    authDomain: String
    projectId: String
    storageBucket: String
    msgSenderId: String
    appId: String
    measurementId: String
    vapidKey: String
  }
  input SentryConfigurationInput {
    dashboardSentryUrl: String
    webSentryUrl: String
    apiSentryUrl: String
    customerAppSentryUrl: String
    restaurantAppSentryUrl: String
    riderAppSentryUrl: String
  }
  input GoogleApiKeyConfigurationInput { googleApiKey: String }
  input CloudinaryConfigurationInput { cloudinaryUploadUrl: String, cloudinaryApiKey: String }
  input AmplitudeApiKeyConfigurationInput { webAmplitudeApiKey: String, appAmplitudeApiKey: String }
  input GoogleClientIDConfigurationInput {
    webClientID: String
    androidClientID: String
    iOSClientID: String
    expoClientID: String
  }
  input WebConfigurationInput {
    serverUrlWeb: String
    wsServerUrlWeb: String
    googleMapLibraries: String
    googleColor: String
  }
  input AppConfigurationsInput { termsAndConditions: String, privacyPolicy: String, testOtp: String }
  input DeliveryCostConfigurationInput { deliveryRate: Float, costType: String }
  input PaypalConfigurationInput { clientId: String, clientSecret: String, sandbox: Boolean }
  input StripeConfigurationInput { publishableKey: String, secretKey: String }
  input TwilioConfigurationInput {
    twilioAccountSid: String
    twilioAuthToken: String
    twilioPhoneNumber: String
    twilioEnabled: Boolean
  }
  input VerificationConfigurationInput { skipEmailVerification: Boolean, skipMobileVerification: Boolean }
  input CurrencyConfigurationInput { currency: String, currencySymbol: String }

  enum WhatsAppConversationStatus {
    BOT
    MANUAL
    CLOSED
  }

  enum WhatsAppBotState {
    WELCOME
    SELECTING_RESTAURANT
    BROWSING_MENU
    VIEWING_CART
    AWAITING_ADDRESS
    AWAITING_LOCATION
    AWAITING_PAYMENT
    ORDER_CREATED
  }

  type WhatsAppConnection {
    _id: ID!
    restaurant: ID
    phoneNumberId: String!
    whatsappBusinessAccountId: String!
    displayPhoneNumber: String!
    verifiedName: String!
    accessTokenConfigured: Boolean!
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type WhatsAppCartItem {
    foodId: ID!
    variationId: ID!
    title: String!
    quantity: Int!
    unitPrice: Float!
  }

  type WhatsAppConversation {
    _id: ID!
    connection: ID!
    restaurant: ID
    customerWaId: String!
    customerName: String!
    purpose: String!
    status: WhatsAppConversationStatus!
    botState: WhatsAppBotState!
    cart: [WhatsAppCartItem!]!
    deliveryAddress: String!
    paymentMethod: String!
    order: Order
    unreadCount: Int!
    lastMessagePreview: String!
    lastMessageAt: DateTime!
    lastInboundAt: DateTime
    lastOutboundAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type WhatsAppMessage {
    _id: ID!
    conversation: ID!
    restaurant: ID
    metaMessageId: String
    direction: String!
    type: String!
    text: String!
    payload: JSON
    status: String!
    error: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input WhatsAppConnectionInput {
    restaurantId: ID
    phoneNumberId: String!
    whatsappBusinessAccountId: String
    displayPhoneNumber: String
    verifiedName: String
    accessToken: String
    isActive: Boolean
  }

  enum WhatsAppMessageTemplateCategory {
    UTILITY
    MARKETING
    AUTHENTICATION
  }

  type WhatsAppMessageTemplate {
    id: ID!
    name: String!
    status: String!
    category: WhatsAppMessageTemplateCategory!
    language: String!
    body: String!
  }

  input CreateWhatsAppMessageTemplateInput {
    connectionId: ID
    name: String!
    category: WhatsAppMessageTemplateCategory!
    language: String!
    body: String!
    exampleValues: [String!]
  }

  type Query {
    users: [User!]!
    profile: User
    getCountryByIso(iso: String!): Country!
    order(id: String!): Order
    orderPaypal(id: String!): Order
    orderStripe(id: String!): Order
    orders(offset: Int): [Order!]!
    allOrders(page: Int): [AdminOrder!]!
    restaurantOrders: [Order!]!
    riderOrders: [Order!]!
    orderCount(restaurant: String!): Int!
    pageCount(restaurant: String!): Int!
    ordersByRestId(restaurant: String!, page: Int, rows: Int, search: String): [Order!]!
    getOrdersByDateRange(startingDate: String!, endingDate: String!, restaurant: String!): CashOrderSummary!
    getActiveOrders(restaurantId: ID): [Order!]!
    getActiveOrdersWithPagination(page: Int, rowsPerPage: Int, search: String, restaurantId: ID): ActiveOrderPage!
    restaurant(id: String, slug: String): Restaurant
    restaurantList: [Restaurant!]!
    restaurants: [Restaurant!]!
    restaurantByOwner(id: String): User
    nearByRestaurants(latitude: Float, longitude: Float, shopType: String): NearbyRestaurants!
    nearByRestaurantsPreview(latitude: Float, longitude: Float, shopType: String): NearbyRestaurantPreviews!
    topRatedVendorsPreview(latitude: Float!, longitude: Float!): [RestaurantPreview!]!
    recentOrderRestaurantsPreview(latitude: Float!, longitude: Float!): [RestaurantPreview!]!
    mostOrderedRestaurantsPreview(latitude: Float!, longitude: Float!): [RestaurantPreview!]!
    relatedItems(itemId: String!, restaurantId: String!): [ID!]!
    popularItems(restaurantId: String!): [PopularItem!]!
    cuisines: [Cuisine!]!
    rider(id: String): Rider
    riders: [Rider!]!
    availableRiders: [Rider!]!
    ridersByZone(id: String!): [Rider!]!
    riderEarnings(id: String, offset: Int): [Earning!]!
    riderWithdrawRequests(id: String, offset: Int): [WithdrawRequest!]!
    getAllWithdrawRequests(offset: Int, page: Int, rowsPerPage: Int, search: String): WithdrawRequestList!
    taxes: [Taxation!]!
    tips: [Tipping!]!
    userFavourite(latitude: Float, longitude: Float): [Restaurant!]!
    chat(order: ID!): [ChatMessage!]!
    configuration: Configuration!
    lastOrderCreds: LastOrderCreds!
    zones: [Zone!]!
    vendors: [User!]!
    getVendor(id: String!): User
    coupons(page: Int, rowsPerPage: Int, search: String): CouponPage!
    banners: [Banner!]!
    bannerActions: [String!]!
    addons: [CatalogAddon!]!
    options: [Option!]!
    getPaymentStatuses: [String!]!
    offers: [Offer!]!
    sections: [Section!]!
    reviews(restaurant: String!): [Review!]!
    getDashboardTotal(starting_date: String, ending_date: String, restaurant: String!): DashboardTotal!
    getDashboardSales(starting_date: String, ending_date: String, restaurant: String!): DashboardSeries!
    getDashboardOrders(starting_date: String, ending_date: String, restaurant: String!): DashboardSeries!
    getDashboardData(starting_date: String, ending_date: String): DashboardData!
    whatsappConnections(restaurantId: ID): [WhatsAppConnection!]!
    whatsappMessageTemplates(connectionId: ID): [WhatsAppMessageTemplate!]!
    whatsappConversations(restaurantId: ID, status: WhatsAppConversationStatus, limit: Int, offset: Int): [WhatsAppConversation!]!
    whatsappMessages(conversationId: ID!, limit: Int, before: DateTime): [WhatsAppMessage!]!
  }

  type Mutation {
    login(email: String, password: String, type: String!, appleId: String, name: String, notificationToken: String): AuthData!
    createUser(userInput: UserInput!): AuthData!
    riderLogin(username: String, password: String, notificationToken: String): AuthData!
    restaurantLogin(username: String!, password: String!): AuthData!
    ownerLogin(email: String!, password: String!): AuthData!
    updateUser(updateUserInput: UpdateUserInput!): User!
    updateNotificationStatus(offerNotification: Boolean!, orderNotification: Boolean!): User!
    pushToken(token: String): User!
    uploadToken(id: String!, pushToken: String!): User!
    saveNotificationTokenWeb(token: String!): ActionResult!
    emailExist(email: String!): User
    phoneExist(phone: String!): User
    sendOtpToEmail(email: String!, otp: String!): Result!
    sendOtpToPhoneNumber(phone: String!, otp: String!): Result!
    forgotPassword(email: String!, otp: String!): Result!
    resetPassword(password: String!, email: String, token: String): Result!
    changePassword(oldPassword: String!, newPassword: String!): Boolean!
    vendorResetPassword(oldPassword: String!, newPassword: String!): Boolean!
    Deactivate(isActive: Boolean!, email: String!): User!
    createAddress(addressInput: AddressInput!): User!
    editAddress(addressInput: AddressInput!): User!
    deleteAddress(id: ID!): User!
    selectAddress(id: String!): User!
    addFavourite(id: String!): User!
    coupon(coupon: String!): Coupon
    placeOrder(restaurant: String!, orderInput: [OrderInput!]!, paymentMethod: String!, couponCode: String, tipping: Float!, taxationAmount: Float!, address: AddressInput!, orderDate: String!, isPickedUp: Boolean!, deliveryCharges: Float!, instructions: String): Order!
    abortOrder(id: String!): Order!
    updateOrderStatus(id: String!, status: String!, reason: String): Order!
    updateStatus(id: String!, orderStatus: String!): Order!
    updateOrderStatusRider(id: String!, status: String!): Order!
    acceptOrder(_id: String!, time: String): Order!
    cancelOrder(_id: String!, reason: String!): Order!
    orderPickedUp(_id: String!): Order!
    assignOrder(id: String!): Order!
    assignRider(id: String!, riderId: String!): Order!
    updatePaymentStatus(id: String!, status: String!): Order!
    reviewOrder(reviewInput: ReviewInput!): Order!
    sendChatMessage(message: ChatMessageInput!, orderId: ID!): ChatResult!
    updateRiderLocation(latitude: String!, longitude: String!): Rider!
    toggleAvailablity(id: String): Rider!
    saveRestaurantToken(token: String, isEnabled: Boolean): Restaurant!
    toggleAvailability: Restaurant!
    muteRing(orderId: String): Boolean!
    createWithdrawRequest(amount: Float!): WithdrawRequest!
    createEarning(earningsInput: EarningsInput): Earning!
    updateWithdrawReqStatus(id: ID!, status: String!): WithdrawUpdateResult!
    createFood(foodInput: FoodInput!): Restaurant!
    editFood(foodInput: FoodInput!): Restaurant!
    deleteFood(id: String!, restaurant: String!, categoryId: String!): Restaurant!
    createCategory(category: CategoryInput): Restaurant!
    editCategory(category: CategoryInput): Restaurant!
    deleteCategory(id: String!, restaurant: String!): Restaurant!
    createOptions(optionInput: CreateOptionInput): Restaurant!
    editOption(optionInput: editOptionInput): Restaurant!
    deleteOption(id: String!, restaurant: String!): Restaurant!
    createAddons(addonInput: AddonInput): Restaurant!
    editAddon(addonInput: editAddonInput): Restaurant!
    deleteAddon(id: String!, restaurant: String!): Restaurant!
    createRider(riderInput: RiderInput!): Rider!
    editRider(riderInput: RiderInput!): Rider!
    deleteRider(id: String!): Rider!
    createVendor(vendorInput: VendorInput): User!
    editVendor(vendorInput: VendorInput): User!
    deleteVendor(id: String!): Boolean!
    createRestaurant(restaurant: RestaurantInput!, owner: ID!): Restaurant!
    editRestaurant(restaurant: RestaurantProfileInput!): Restaurant!
    deleteRestaurant(id: String!): Restaurant!
    updateTimings(id: String!, openingTimes: [TimingsInput]): Restaurant!
    updateCommission(id: String!, commissionRate: Float!): Restaurant!
    updateDeliveryBoundsAndLocation(id: ID!, boundType: String!, bounds: [[[Float!]]], circleBounds: CircleBoundsInput, location: CoordinatesInput!, address: String, postCode: String, city: String): DeliveryBoundsResult!
    createZone(zone: ZoneInput!): Zone!
    editZone(zone: ZoneInput!): Zone!
    deleteZone(id: String!): Zone!
    createCoupon(couponInput: CouponInput!): Coupon!
    editCoupon(couponInput: CouponInput!): Coupon!
    deleteCoupon(id: String!): Boolean!
    createCuisine(cuisineInput: CuisineInput!): Cuisine!
    editCuisine(cuisineInput: CuisineInput!): Cuisine!
    deleteCuisine(id: String!): Boolean!
    createBanner(bannerInput: BannerInput!): Banner!
    editBanner(bannerInput: BannerInput!): Banner!
    deleteBanner(id: String!): Boolean!
    createOffer(offer: OfferInput!): Offer!
    editOffer(offer: OfferInput!): Offer!
    deleteOffer(id: String!): Boolean!
    createSection(section: SectionInput!): Section!
    editSection(section: SectionInput!): Section!
    deleteSection(id: String!): Boolean!
    createTipping(tippingInput: TippingInput!): Tipping!
    editTipping(tippingInput: TippingInput!): Tipping!
    createTaxation(taxationInput: TaxationInput!): Taxation!
    editTaxation(taxationInput: TaxationInput!): Taxation!
    sendNotificationUser(notificationTitle: String, notificationBody: String!): Boolean!
    saveEmailConfiguration(configurationInput: EmailConfigurationInput!): Configuration!
    saveFormEmailConfiguration(configurationInput: FormEmailConfigurationInput!): Configuration!
    saveSendGridConfiguration(configurationInput: SendGridConfigurationInput!): Configuration!
    saveFirebaseConfiguration(configurationInput: FirebaseConfigurationInput!): Configuration!
    saveSentryConfiguration(configurationInput: SentryConfigurationInput!): Configuration!
    saveGoogleApiKeyConfiguration(configurationInput: GoogleApiKeyConfigurationInput!): Configuration!
    saveCloudinaryConfiguration(configurationInput: CloudinaryConfigurationInput!): Configuration!
    saveAmplitudeApiKeyConfiguration(configurationInput: AmplitudeApiKeyConfigurationInput!): Configuration!
    saveGoogleClientIDConfiguration(configurationInput: GoogleClientIDConfigurationInput!): Configuration!
    saveWebConfiguration(configurationInput: WebConfigurationInput!): Configuration!
    saveAppConfigurations(configurationInput: AppConfigurationsInput!): Configuration!
    saveDeliveryRateConfiguration(configurationInput: DeliveryCostConfigurationInput!): Configuration!
    savePaypalConfiguration(configurationInput: PaypalConfigurationInput!): Configuration!
    saveStripeConfiguration(configurationInput: StripeConfigurationInput!): Configuration!
    saveTwilioConfiguration(configurationInput: TwilioConfigurationInput!): Configuration!
    saveVerificationsToggle(configurationInput: VerificationConfigurationInput!): Configuration!
    saveCurrencyConfiguration(configurationInput: CurrencyConfigurationInput!): Configuration!
    upsertWhatsAppConnection(input: WhatsAppConnectionInput!): WhatsAppConnection!
    createWhatsAppMessageTemplate(input: CreateWhatsAppMessageTemplateInput!): WhatsAppMessageTemplate!
    takeOverWhatsAppConversation(conversationId: ID!): WhatsAppConversation!
    releaseWhatsAppConversationToBot(conversationId: ID!): WhatsAppConversation!
    closeWhatsAppConversation(conversationId: ID!): WhatsAppConversation!
    markWhatsAppConversationRead(conversationId: ID!): WhatsAppConversation!
    sendWhatsAppInboxMessage(conversationId: ID!, text: String!): WhatsAppMessage!
  }

  type Subscription {
    subscriptionOrder(id: String!): Order!
    subscribeOrderStatus(_id: String!): Order!
    subscribePlaceOrder(restaurant: String!): OrderEvent!
    orderStatusChanged(userId: String!): OrderEvent!
    subscriptionZoneOrders(zoneId: String!): OrderEvent!
    subscriptionAssignRider(riderId: String!): OrderEvent!
    subscriptionRiderLocation(riderId: String!): Rider!
    subscriptionNewMessage(order: ID!): ChatMessage!
    whatsappMessageAdded(restaurantId: ID): WhatsAppMessage!
    whatsappConversationUpdated(restaurantId: ID): WhatsAppConversation!
  }
`
