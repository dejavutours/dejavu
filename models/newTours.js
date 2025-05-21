const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const newToursSchema = new Schema(
  {
    // Name of the tour package (e.g., "Goa Beach Tour")
    name: { type: String, required: true },
    // State where the tour is conducted (e.g., "Goa")
    state: { type: String, required: true },
    // Main tour image URL
    imageurl: { type: String },
    // Array of banner image URLs
    bannerimages: [{ type: String }],
    // Tour visibility status
    isActive: { type: Boolean, default: false },
    // Major destinations covered (e.g., "Goa, Panaji, Baga Beach")
    destinations: { type: String, default: "" },
    // Route taken during the tour (e.g., "Mumbai - Goa - Mumbai")
    route: { type: String, default: "" },
    // Duration of the tour (e.g., "4 days")
    days: { type: String, default: "" },
    // Cost per person
    price: { type: Number, default: 0 },
    // Brief tour description
    about: { type: String, default: "" },
    // Trip difficulty (e.g., "Easy to Moderate")
    tripType: { type: String, default: "" },
    // Altitude of destination (e.g., "12,000ft")
    altitude: { type: String, default: "" },
    // Recommended time of year (e.g., ["Summer", "wintor"])
    bestSession: { type: [String], default: [] },
    // Category tags for the field trip (e.g., ["Adventure", "School Trip"])
    tripCategories: { type: [String], default: [] },
    // Departure cities with pricing, dates, and additional booking details
    // Best month to visit for this tour (e.g., "June")
    bestMonthToVisit: { type: [String], default: [] }, // Multiple  month for optimal travel experience
    // Traveler type (e.g., ["Family", "Solo"])
    travelerType: { type: [String], default: [] },
    deptcities: {
      type: [
        {
          State: { type: String, default: "" },
          City: { type: String, default: "" },
          tripDuration: { type: String, default: "" },
          dates: {
            type: [
              {
                Year: { type: String, default: "" },
                Month: { type: String, default: "" },
                dates: { type: String, default: "" },
              },
            ],
            default: [],
          },
          price: {
            type: [
              {
                transferType: { type: String, default: "" },
                adultPrice: { type: Number, default: 0 },
                childPrice: { type: Number, default: 0 },
              },
            ],
            default: [],
          },
          // Number of available slots for this departure city (e.g., "20")
          availableSlots: { type: String, default: "0" }, // String for UI input flexibility
          // Partial payment amount required for booking from this city (e.g., "5000")
          partialPayment: { type: String, default: "0" }, // String for UI input flexibility
          // Number of days before trip start date to stop online bookings (e.g., "2")
          bookingCutoffDays: { type: String, default: "0" }, // String for UI input, specifies days prior to trip when bookings close
        },
      ],
      default: [],
    },
    // Upcoming trip start dates
    trip_dates: {
      type: [
        {
          Year: { type: String, default: "" },
          Month: { type: String, default: "" },
          dates: { type: String, default: "" },
        },
      ],
      default: [],
    },
    // Activities included (e.g., "Boating, Jet Ski")
    activities: { type: String, default: "" },
    // Daily itinerary
    itinerary: {
      type: [
        {
          day: { type: String, default: "" },
          header: { type: String, default: "" },
          description: { type: String, default: "" },
        },
      ],
      default: [],
    },
    // Recommended items to carry (e.g., "Sunscreen, Sunglasses")
    things_to_carry: { type: String, default: "" },
    // Inclusions and exclusions
    includenexclude: { type: String, default: "" },
    // Display-friendly cost (e.g., "₹9,999")
    package_cost: { type: String, default: "" },
    // FAQs for the tour
    infonfaq: { type: String, default: "" },
    // Booking and cancellation policy
    bookncancel: { type: String, default: "" },
    // Traveler rules (e.g., "No smoking")
    guidelines: { type: String, default: "" },
    // Upcoming trip schedules
    upcomingtrip: { type: [Date], default: [] },
    // Additional tour images
    imageUrlAll: { type: [String], default: [] },
    // YouTube video link
    youtubeUrl: { type: String, default: "" },
    // PDF document URL
    documentUrl: { type: String, default: "" },
    // SEO meta keywords (e.g., ["Goa", "beach tour"])
    metaKeywords: [{ type: String, default: "" }],
    // SEO meta description (ideal: 50–160 characters)
    metaDescription: { type: String, default: "" },
    // Display order for sorting tours
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Ensure unique tour names
newToursSchema.index({ name: 1 }, { unique: true });

module.exports =
  mongoose.models.NewTours || mongoose.model("NewTours", newToursSchema);
