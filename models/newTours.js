const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const newToursSchema = new Schema(
  {
    name: { type: String, required: true },
    // Purpose: Name of the tour package (e.g., "Goa Beach Tour").

    state: { type: String, required: true },
    // Purpose: The state where the tour is conducted (e.g., "Goa")
    imageurl: { type: String }, // Keep this for backward compatibility if needed
    // Array of strings for multiple banner images
    bannerimages: [{ type: String }], 
  
    isActive: { type: Boolean, default: true }, // Added for status toggle
    
    destinations: { type: String, default: "" },
    // Purpose: Major destinations covered in the tour (e.g., "Goa, Panaji, Baga Beach").

    route: { type: String, default: "" },
    // Purpose: The route taken during the tour (e.g., "Mumbai - Goa - Mumbai").

    days: { type: String, default: "" },
    // Purpose: Duration of the tour (e.g., "4 days", "3 days - 2 nights").

    price: { type: Number, default: 0 },
    // Purpose: Cost of the tour package per person.

    about: { type: String, default: "" },
    // Purpose: Brief description of the tour.

    tripType: { type: String, default: "" },
    // Purpose: Type of trip (e.g., "Easy to Moderate").

    altitude: { type: String, default: "" },
    // Purpose: Altitude of the destination (if applicable) (e.g., "12,000ft").

    bestSession: { type: String, default: "" },
    // Purpose: Recommended time of the year for the tour (e.g., "May to October").

    deptstate: { type: String, default: "" },
    // Purpose: Departure state for the tour.

    deptcities: {
      type: [
        {
          State: { type: String, default: "" }, // e.g., "GJ"
          City: { type: String, default: "" },  // e.g., "AHM"
          tripDuration: { type: String, default: "" },
          dates: {
            type: [
              {
                Year: { type: String, default: "" },
                Month: { type: String, default: "" }, // e.g., "May"
                dates: { type: String, default: "" },
              }
            ],
            default: [],
          },
          price: {
            type: [
              {
                transferType: { type: String, default: "" },
                adultPrice: { type: Number, default: 0 },
                childPrice: { type: Number, default: 0 },
              }
            ],
            default: [],
          }
        }
      ],
      default: [],
    },
    // Purpose: List of departure cities, their cost, and available travel dates.

    trip_dates: {
      type: [
        {
          Year: { type: String, default: "" },
          Month: { type: String, default: "" },
          dates: { type: String, default: "" },
        }
      ],
      default: [],
    },
    // Purpose: List of upcoming trip start dates.

    activities: { type: String, default: "" },
    // Purpose: Activities included in the tour (e.g., "Boating, Jet Ski, Paragliding").

    itinerary: {
      type: [
        {
          day: { type: String, default: "" },
          header: { type: String, default: "" },
          description: { type: String, default: "" },
        }
      ],
      default: [],
    },
    // Purpose: Daily schedule and plan for the tour.

    things_to_carry: { type: String, default: "" },
    // Purpose: List of recommended items to carry (e.g., "Sunscreen, Sunglasses, Swimsuit").

    includenexclude: { type: String, default: "" },

    package_cost: { type: String, default: "" },
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

// const getStateShortCode = (stateName) => {
//   if (!stateName) return '';
//   return stateName
//     .split(' ')
//     .map(word => word[0].toUpperCase())
//     .join('');
// };

// newToursSchema.add({
//   tripCode: { type: String, unique: true }
// });

// newToursSchema.pre('validate', async function (next) {
//   if (this.tripCode) return next();

//   const now = new Date();
//   const mm = (now.getMonth() + 1).toString().padStart(2, '0');
//   const yy = now.getFullYear().toString().slice(-2);
//   const stateShort = getStateShortCode(this.state);

//   const prefix = `${stateShort}${mm}${yy}`;

//   try {
//     const lastTour = await this.constructor
//       .findOne({ tripCode: { $regex: `^${prefix}` } })
//       .sort({ tripCode: -1 });

//     let nextIncrement = 1;
//     if (lastTour && lastTour.tripCode) {
//       const lastCode = lastTour.tripCode;
//       const incrementStr = lastCode.slice(prefix.length);
//       const lastIncrement = parseInt(incrementStr, 10);
//       nextIncrement = lastIncrement + 1;
//     }

//     this.tripCode = `${prefix}${String(nextIncrement).padStart(2, '0')}`;
//     next();
//   } catch (err) {
//     next(err);
//   }
// });


module.exports = mongoose.models.NewTours || mongoose.model("NewTours", newToursSchema);
