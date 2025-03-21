const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const newToursSchema = new Schema(
  {
    name: { type: String, required: true },
    // Purpose: Name of the tour package (e.g., "Goa Beach Tour").

    state: { type: String, required: true },
    // Purpose: The state where the tour is conducted (e.g., "Goa").

    imageurl: { type: String, required: true },
    // Purpose: Primary image URL representing the tour.

    bannerimages: { type: String },
    // Purpose: List of images used as banners for promotions.

    destinations: { type: String, required: true },
    // Purpose: Major destinations covered in the tour (e.g., "Goa, Panaji, Baga Beach").

    route: { type: String, required: true },
    // Purpose: The route taken during the tour (e.g., "Mumbai - Goa - Mumbai").

    days: { type: String, required: true },
    // Purpose: Duration of the tour (e.g., "4 days", "3 days - 2 nights").

    tag: { type: String, default: "" },
    // Purpose: Keywords for categorization (e.g., "Beach, Adventure").

    price: { type: Number, required: true },
    // Purpose: Cost of the tour package per person.

    about: { type: String, required: true },
    // Purpose: Brief description of the tour.

    tripType: { type: String, required: true },
    // Purpose: Type of trip (e.g., "Easy to Moderate").

    altitude: { type: String, default: "" },
    // Purpose: Altitude of the destination (if applicable) (e.g., "12,000ft").

    bestSession: { type: String, default: "" },
    // Purpose: Recommended time of the year for the tour (e.g., "May to October").

    deptstate: { type: String, default: "" },
    // Purpose: Departure state for the tour.

    deptcities: [
      {
        State: String, // Purpose: Departure state (e.g., "GJ").
        City: String, // Purpose: Departure city (e.g., "AHM").
        tripDuration: String, // Purpose: Cost per person for the package.
        dates: [
          {
            Year: String,
            Month: String, // Purpose: Available month (e.g., "May").
            dates: String, // Purpose: Specific departure dates in that month.
          },
        ],
        price:[{
          transferType: String,
          adultPrice: Number,
          childPrice: Number
         }]
      },
    ],
    // Purpose: List of departure cities, their cost, and available travel dates.

    trip_dates: [
        {
            Year: String,
            Month: String,  // Available month (e.g., "May")
            dates: String   // Specific departure dates in that month
        }
    ],
    // Purpose: List of upcoming trip start dates.

    placestovisit: { type: String, required: true },
    // Purpose: Key attractions covered in the tour (e.g., "Baga Beach, Calangute, Fort Aguada").

    activities: { type: String, required: true },
    // Purpose: Activities included in the tour (e.g., "Boating, Jet Ski, Paragliding").

    itinerary: [
      {
        day: String, // Purpose: Day number (e.g., "Day 1").
        header:String,
        description: String, // Purpose: Activities and schedule for the day
      },
    ],
    // Purpose: Daily schedule and plan for the tour.

    things_to_carry: { type: String, required: true },
    // Purpose: List of recommended items to carry (e.g., "Sunscreen, Sunglasses, Swimsuit").

    includenexclude: { type: String, required: true },

    package_cost: { type: String, required: true },
    // Purpose: Final cost of the tour package, displayed in user-friendly format (e.g., "₹9,999").

    infonfaq: { type: String, default: "" },
    // Purpose: Common FAQs related to the tour.

    bookncancel: { type: String, default: "" },
    // Purpose: Booking and cancellation policy.

    guidelines: { type: String, default: "" },
    // Purpose: Rules and regulations for travelers (e.g., "No smoking, No littering").

    upcomingtrip: { type: [Date], default: [] },
    // Purpose: List of upcoming trip schedules.

    imageUrlAll: { type: [String], default: [] },
    // Purpose: Additional images of the tour package.

    youtubeUrl: { type: String, default: "" },
    // Purpose: YouTube video link showcasing the tour.
  },
  { timestamps: true }
);

module.exports = mongoose.model("NewTours", newToursSchema);
