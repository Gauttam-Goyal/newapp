const mongoose = require("mongoose");
const cities = require("./cities");
const { places, descriptors } = require("./seedHelpers");
const Campground = require("../models/campground");

mongoose.connect("mongodb://localhost:27017/yelp-camp");

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Database connected");
});

const sample = (array) => array[Math.floor(Math.random() * array.length)];

const seedDB = async () => {
  await Campground.deleteMany({});
  for (let i = 0; i < 50; i++) {
    const random1000 = Math.floor(Math.random() * 1000);
    const pric = Math.floor(Math.random() * 30) + 10;
    const camp = new Campground({
      author: "6470f3b687977a7d20e3fad6",
      location: `${cities[random1000].city}, ${cities[random1000].state}`,
      title: `${sample(descriptors)} ${sample(places)}`,
      // image:"https://source.unsplash.com/collection/483251",
      description:
        "Lorem ipsum dolor sit amet consectetur adipisicing elit. Quia voluptatem quibusdam, officiis iusto delectus omnis illum obcaecati saepe hic aperiam aspernatur libero totam perferendis itaque!",
      price: pric,
      geometry: {
        type: "Point",
        coordinates: [cities[random1000].longitude, cities[random1000].latitude]
    },
      images: [
        {
          url: "https://res.cloudinary.com/dzswmfqts/image/upload/v1685540616/YelpCamp/vije12fjkdm6q9ocrddn.jpg",
          filename: "YelpCamp/vije12fjkdm6q9ocrddn",
        },
        {
          url: "https://res.cloudinary.com/dzswmfqts/image/upload/v1685540618/YelpCamp/b8dcpek5mzpqrurlvz2e.jpg",
          filename: "YelpCamp/b8dcpek5mzpqrurlvz2e",
        },
      ],
    });
    await camp.save();
  }
};
seedDB().then(() => {
  mongoose.connection.close();
});
