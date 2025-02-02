Sprint 1

- Crete mongoDB collection
```
db.createCollection("trip_booking_detail", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "tripName", "tripCode", "bookingNumber",
        "totalPerson", "personDetails", "joiningFrom", "bookingStatus",
        "totalTripCost", "paidAmount", "paidAmountRef", "tripStartDate", "tripEndDate"
      ],
      properties: {
        userId: { bsonType: "string", description: "User ID from users collection" },
        tempUserID: { bsonType: "string", description: "Temporary user identifier" },
        tripName: { bsonType: "string", description: "Trip name derived from tours collection" },
        tripCode: { bsonType: "string", description: "Trip code derived from tours collection" },
        bookingNumber: { bsonType: "string", description: "Auto-generated booking number", uniqueItems: true },
        totalPerson: {
          bsonType: "object",
          required: ["adult", "child"],
          properties: {
            adult: { bsonType: "int", description: "Number of adults" },
            child: { bsonType: "int", description: "Number of children" }
          }
        },
        personDetails: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["name", "birthdate", "age", "isAdult"],
            properties: {
              name: { bsonType: "string", description: "Person's name" },
              birthdate: { bsonType: "date", description: "Birthdate of the person" },
              age: { bsonType: "int", description: "Age auto-calculated" },
              isAdult: { bsonType: "bool", description: "True if age >= 10" }
            }
          }
        },
        joiningFrom: { bsonType: "string", description: "Location from where the user joins the trip" },
        bookingStatus: {
          bsonType: "string",
          enum: ["Reserved", "Confirmed"],
          description: "Booking status based on payment"
        },
        totalTripCost: { bsonType: "double", description: "Total cost of the trip" },
        paidAmount: { bsonType: "double", description: "Amount paid by the user" },
        paidAmountRef: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["isThroughPymtGateway", "amount"],
            properties: {
              isThroughPymtGateway: { bsonType: "bool", description: "True if online, false if offline" },
              orderId: { bsonType: "string", description: "Order ID from payment collection" },
              paymentDate: { bsonType: "date", description: "Date of offline payment" },
              amount: { bsonType: "double", description: "Paid amount" }
            }
          }
        },
        tripStartDate: { bsonType: "date", description: "Trip start date" },
        tripEndDate: { bsonType: "date", description: "Trip end date" }
      }
    }
  }
});


```
