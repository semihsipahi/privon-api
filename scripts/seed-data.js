// MongoDB Seed Script
// Usage: Run this script in MongoDB shell or via mongosh
// mongosh mongodb://localhost:27017/yemapp < seed-data.js
// or from docker: docker exec -i <container_id> mongosh yemapp < seed-data.js

// Clear existing data (optional - uncomment if needed)
// db.users.deleteMany({});
// db.restaurants.deleteMany({});
// db.reviews.deleteMany({});
// db.restauranttypes.deleteMany({});
// db.slotreservations.deleteMany({});

// ========================
// Generate ObjectIds
// ========================
const superAdminId = ObjectId();
const restaurantOwner1Id = ObjectId();
const restaurantOwner2Id = ObjectId();
const user1Id = ObjectId();
const user2Id = ObjectId();
const user3Id = ObjectId();

const restaurant1Id = ObjectId();
const restaurant2Id = ObjectId();
const restaurant3Id = ObjectId();

const category1Id = ObjectId();
const category2Id = ObjectId();
const category3Id = ObjectId();

const reservation1Id = ObjectId();
const reservation2Id = ObjectId();
const reservation3Id = ObjectId();
const reservation4Id = ObjectId();
const reservation5Id = ObjectId();

const now = new Date();

// ========================
// Restaurant Types (Categories)
// ========================
db.restauranttypes.insertMany([
    {
        _id: category1Id,
        name: "Türk Mutfağı",
        isDefault: true,
        createdAt: now,
        updatedAt: now
    },
    {
        _id: category2Id,
        name: "İtalyan",
        isDefault: false,
        createdAt: now,
        updatedAt: now
    },
    {
        _id: category3Id,
        name: "Japon",
        isDefault: false,
        createdAt: now,
        updatedAt: now
    },
    {
        _id: ObjectId(),
        name: "Fast Food",
        isDefault: false,
        createdAt: now,
        updatedAt: now
    },
    {
        _id: ObjectId(),
        name: "Cafe & Kahvaltı",
        isDefault: false,
        createdAt: now,
        updatedAt: now
    }
]);

print("✓ Restaurant types created");

// ========================
// Users
// ========================
// Password hash for "123456" - bcrypt hash
const passwordHash = "$2b$10$TTvAxKzCFUu2nuZ2jFPfyef2nwU/SH8K4tzxjZ/IB8C7L6xNPoNju";

db.users.insertMany([
    // Super Admin
    {
        _id: superAdminId,
        fullName: "Sistem Yöneticisi",
        maskedName: "S*** Y***",
        email: "admin@yemapp.com",
        phoneNumber: "+905551234567",
        password: passwordHash,
        isPhoneVerified: true,
        role: "super_admin",
        imageUrl: "",
        isActive: true,
        createdAt: now,
        updatedAt: now
    },
    // Restaurant Owner 1
    {
        _id: restaurantOwner1Id,
        fullName: "Ahmet Yılmaz",
        maskedName: "A*** Y***",
        email: "ahmet@kasapusta.com",
        phoneNumber: "+905551234568",
        password: passwordHash,
        isPhoneVerified: true,
        role: "restaurant_owner",
        imageUrl: "",
        isActive: true,
        createdAt: now,
        updatedAt: now
    },
    // Restaurant Owner 2
    {
        _id: restaurantOwner2Id,
        fullName: "Marco Rossi",
        maskedName: "M*** R***",
        email: "marco@lapiazza.com",
        phoneNumber: "+905551234569",
        password: passwordHash,
        isPhoneVerified: true,
        role: "restaurant_owner",
        imageUrl: "",
        isActive: true,
        createdAt: now,
        updatedAt: now
    },
    // Regular User 1
    {
        _id: user1Id,
        fullName: "Elif Demir",
        maskedName: "E*** D***",
        email: "elif@gmail.com",
        phoneNumber: "+905551234570",
        password: passwordHash,
        isPhoneVerified: true,
        role: "user",
        imageUrl: "",
        isActive: true,
        createdAt: now,
        updatedAt: now
    },
    // Regular User 2
    {
        _id: user2Id,
        fullName: "Mehmet Kaya",
        maskedName: "M*** K***",
        email: "mehmet@gmail.com",
        phoneNumber: "+905551234571",
        password: passwordHash,
        isPhoneVerified: true,
        role: "user",
        imageUrl: "",
        isActive: true,
        createdAt: now,
        updatedAt: now
    },
    // Regular User 3
    {
        _id: user3Id,
        fullName: "Zeynep Çelik",
        maskedName: "Z*** Ç***",
        email: "zeynep@gmail.com",
        phoneNumber: "+905551234572",
        password: passwordHash,
        isPhoneVerified: true,
        role: "user",
        imageUrl: "",
        isActive: true,
        createdAt: now,
        updatedAt: now
    }
]);

print("✓ Users created");

// ========================
// Restaurants
// ========================
const defaultWorkingHours = [
    { dayName: "Pazartesi", openingTime: "09:00", closingTime: "22:00", isClosed: false },
    { dayName: "Salı", openingTime: "09:00", closingTime: "22:00", isClosed: false },
    { dayName: "Çarşamba", openingTime: "09:00", closingTime: "22:00", isClosed: false },
    { dayName: "Perşembe", openingTime: "09:00", closingTime: "22:00", isClosed: false },
    { dayName: "Cuma", openingTime: "09:00", closingTime: "23:00", isClosed: false },
    { dayName: "Cumartesi", openingTime: "10:00", closingTime: "23:00", isClosed: false },
    { dayName: "Pazar", openingTime: "10:00", closingTime: "21:00", isClosed: false }
];

db.restaurants.insertMany([
    {
        _id: restaurant1Id,
        owner: restaurantOwner1Id,
        name: "Kasap Usta Steakhouse",
        images: [
            "https://images.unsplash.com/photo-1544025162-d76694265947?w=800",
            "https://images.unsplash.com/photo-1558030006-450675393462?w=800"
        ],
        category: category1Id,
        isActive: true,
        location: {
            type: "Point",
            coordinates: [29.0217, 41.0082], // Istanbul Kadıköy
            address: "Caferağa Mah. Moda Cad. No:15, Kadıköy/İstanbul"
        },
        website: "https://kasapusta.com",
        phone: "+902165551234",
        email: "info@kasapusta.com",
        menu: "https://kasapusta.com/menu",
        workingHours: defaultWorkingHours,
        createdAt: now,
        updatedAt: now
    },
    {
        _id: restaurant2Id,
        owner: restaurantOwner2Id,
        name: "La Piazza Ristorante",
        images: [
            "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
            "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800"
        ],
        category: category2Id,
        isActive: true,
        location: {
            type: "Point",
            coordinates: [29.0350, 41.0500], // Istanbul Beşiktaş
            address: "Sinanpaşa Mah. Beşiktaş Cad. No:42, Beşiktaş/İstanbul"
        },
        website: "https://lapiazza.com.tr",
        phone: "+902125553456",
        email: "info@lapiazza.com.tr",
        menu: "https://lapiazza.com.tr/menu",
        workingHours: [
            { dayName: "Pazartesi", openingTime: "12:00", closingTime: "23:00", isClosed: false },
            { dayName: "Salı", openingTime: "12:00", closingTime: "23:00", isClosed: false },
            { dayName: "Çarşamba", openingTime: "12:00", closingTime: "23:00", isClosed: false },
            { dayName: "Perşembe", openingTime: "12:00", closingTime: "23:00", isClosed: false },
            { dayName: "Cuma", openingTime: "12:00", closingTime: "00:00", isClosed: false },
            { dayName: "Cumartesi", openingTime: "12:00", closingTime: "00:00", isClosed: false },
            { dayName: "Pazar", openingTime: "12:00", closingTime: "22:00", isClosed: false }
        ],
        createdAt: now,
        updatedAt: now
    },
    {
        _id: restaurant3Id,
        owner: restaurantOwner1Id,
        name: "Sakura Sushi Bar",
        images: [
            "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800",
            "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=800"
        ],
        category: category3Id,
        isActive: true,
        location: {
            type: "Point",
            coordinates: [29.0083, 41.0400], // Istanbul Nişantaşı
            address: "Teşvikiye Mah. Abdi İpekçi Cad. No:28, Şişli/İstanbul"
        },
        website: "https://sakurasushi.com.tr",
        phone: "+902125557890",
        email: "info@sakurasushi.com.tr",
        menu: "https://sakurasushi.com.tr/menu",
        workingHours: [
            { dayName: "Pazartesi", openingTime: "11:00", closingTime: "22:00", isClosed: false },
            { dayName: "Salı", openingTime: "11:00", closingTime: "22:00", isClosed: false },
            { dayName: "Çarşamba", openingTime: "11:00", closingTime: "22:00", isClosed: false },
            { dayName: "Perşembe", openingTime: "11:00", closingTime: "22:00", isClosed: false },
            { dayName: "Cuma", openingTime: "11:00", closingTime: "23:00", isClosed: false },
            { dayName: "Cumartesi", openingTime: "12:00", closingTime: "23:00", isClosed: false },
            { dayName: "Pazar", openingTime: "00:00", closingTime: "00:00", isClosed: true }
        ],
        createdAt: now,
        updatedAt: now
    }
]);

print("✓ Restaurants created");

// ========================
// Slot Reservations (needed for reviews)
// ========================
const pastDate1 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
const pastDate2 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
const pastDate3 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
const pastDate4 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
const pastDate5 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago

db.slotreservations.insertMany([
    {
        _id: reservation1Id,
        schedule: ObjectId(),
        user: user1Id,
        restaurant: restaurant1Id,
        reservationDate: pastDate1,
        slotStartTime: "19:00",
        slotEndTime: "21:00",
        guestCount: 2,
        reservationCode: "RSV-001-ABC",
        status: "COMPLETED",
        discountPercentage: 20,
        orderAmount: 500,
        discountAmount: 100,
        finalAmount: 400,
        validatedAt: pastDate1,
        expiresAt: new Date(pastDate1.getTime() + 24 * 60 * 60 * 1000),
        createdAt: pastDate1,
        updatedAt: pastDate1
    },
    {
        _id: reservation2Id,
        schedule: ObjectId(),
        user: user2Id,
        restaurant: restaurant1Id,
        reservationDate: pastDate2,
        slotStartTime: "20:00",
        slotEndTime: "22:00",
        guestCount: 4,
        reservationCode: "RSV-002-DEF",
        status: "COMPLETED",
        discountPercentage: 15,
        orderAmount: 800,
        discountAmount: 120,
        finalAmount: 680,
        validatedAt: pastDate2,
        expiresAt: new Date(pastDate2.getTime() + 24 * 60 * 60 * 1000),
        createdAt: pastDate2,
        updatedAt: pastDate2
    },
    {
        _id: reservation3Id,
        schedule: ObjectId(),
        user: user1Id,
        restaurant: restaurant2Id,
        reservationDate: pastDate3,
        slotStartTime: "13:00",
        slotEndTime: "15:00",
        guestCount: 2,
        reservationCode: "RSV-003-GHI",
        status: "COMPLETED",
        discountPercentage: 25,
        orderAmount: 600,
        discountAmount: 150,
        finalAmount: 450,
        validatedAt: pastDate3,
        expiresAt: new Date(pastDate3.getTime() + 24 * 60 * 60 * 1000),
        createdAt: pastDate3,
        updatedAt: pastDate3
    },
    {
        _id: reservation4Id,
        schedule: ObjectId(),
        user: user3Id,
        restaurant: restaurant2Id,
        reservationDate: pastDate4,
        slotStartTime: "19:00",
        slotEndTime: "21:00",
        guestCount: 3,
        reservationCode: "RSV-004-JKL",
        status: "COMPLETED",
        discountPercentage: 20,
        orderAmount: 750,
        discountAmount: 150,
        finalAmount: 600,
        validatedAt: pastDate4,
        expiresAt: new Date(pastDate4.getTime() + 24 * 60 * 60 * 1000),
        createdAt: pastDate4,
        updatedAt: pastDate4
    },
    {
        _id: reservation5Id,
        schedule: ObjectId(),
        user: user2Id,
        restaurant: restaurant3Id,
        reservationDate: pastDate5,
        slotStartTime: "18:00",
        slotEndTime: "20:00",
        guestCount: 2,
        reservationCode: "RSV-005-MNO",
        status: "COMPLETED",
        discountPercentage: 30,
        orderAmount: 450,
        discountAmount: 135,
        finalAmount: 315,
        validatedAt: pastDate5,
        expiresAt: new Date(pastDate5.getTime() + 24 * 60 * 60 * 1000),
        createdAt: pastDate5,
        updatedAt: pastDate5
    }
]);

print("✓ Slot reservations created");

// ========================
// Reviews
// ========================
db.reviews.insertMany([
    {
        _id: ObjectId(),
        user: user1Id,
        restaurant: restaurant1Id,
        rating: 5,
        comment: "Mükemmel et kalitesi! Garsonlar çok ilgili ve ortam harika. Kesinlikle tekrar geleceğim. İndirim fırsatı da cabası.",
        restaurantReply: "Değerli yorumunuz için teşekkür ederiz! Sizi tekrar ağırlamaktan mutluluk duyarız.",
        repliedAt: new Date(pastDate1.getTime() + 2 * 24 * 60 * 60 * 1000),
        slotReservation: reservation1Id,
        isActive: true,
        createdAt: new Date(pastDate1.getTime() + 1 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(pastDate1.getTime() + 2 * 24 * 60 * 60 * 1000)
    },
    {
        _id: ObjectId(),
        user: user2Id,
        restaurant: restaurant1Id,
        rating: 4,
        comment: "Yemekler çok lezzetliydi, özellikle antrikot tavsiye ederim. Tek eksik biraz beklettiler ama yoğunluktan dolayı anlaşılır.",
        restaurantReply: null,
        repliedAt: null,
        slotReservation: reservation2Id,
        isActive: true,
        createdAt: new Date(pastDate2.getTime() + 1 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(pastDate2.getTime() + 1 * 24 * 60 * 60 * 1000)
    },
    {
        _id: ObjectId(),
        user: user1Id,
        restaurant: restaurant2Id,
        rating: 5,
        comment: "Gerçek İtalyan mutfağı! Makarnalar el yapımı ve pizzaların hamuru enfes. Şarap seçenekleri de çok iyi.",
        restaurantReply: "Grazie mille! We're glad you enjoyed authentic Italian cuisine. Arrivederci!",
        repliedAt: new Date(pastDate3.getTime() + 1 * 24 * 60 * 60 * 1000),
        slotReservation: reservation3Id,
        isActive: true,
        createdAt: new Date(pastDate3.getTime() + 3 * 60 * 60 * 1000),
        updatedAt: new Date(pastDate3.getTime() + 1 * 24 * 60 * 60 * 1000)
    },
    {
        _id: ObjectId(),
        user: user3Id,
        restaurant: restaurant2Id,
        rating: 4,
        comment: "Romantik bir akşam yemeği için ideal bir mekan. Tiramisu muhteşemdi! İndirim sayesinde hesap da uygun geldi.",
        restaurantReply: null,
        repliedAt: null,
        slotReservation: reservation4Id,
        isActive: true,
        createdAt: new Date(pastDate4.getTime() + 2 * 60 * 60 * 1000),
        updatedAt: new Date(pastDate4.getTime() + 2 * 60 * 60 * 1000)
    },
    {
        _id: ObjectId(),
        user: user2Id,
        restaurant: restaurant3Id,
        rating: 5,
        comment: "İstanbul'un en iyi sushisi! Balıklar taptaze ve sunum mükemmel. Sake seçenekleri de çok kaliteli.",
        restaurantReply: "Thank you for your wonderful review! We always source the freshest fish for our guests. Arigatou gozaimasu!",
        repliedAt: new Date(pastDate5.getTime() + 12 * 60 * 60 * 1000),
        slotReservation: reservation5Id,
        isActive: true,
        createdAt: new Date(pastDate5.getTime() + 4 * 60 * 60 * 1000),
        updatedAt: new Date(pastDate5.getTime() + 12 * 60 * 60 * 1000)
    }
]);

print("✓ Reviews created");

// ========================
// Summary
// ========================
print("\n========================================");
print("Seed data created successfully!");
print("========================================");
print("\nUsers:");
print("  - Super Admin: admin@yemapp.com (pass: 123456)");
print("  - Restaurant Owner 1: ahmet@kasapusta.com");
print("  - Restaurant Owner 2: marco@lapiazza.com");
print("  - User 1: elif@gmail.com");
print("  - User 2: mehmet@gmail.com");
print("  - User 3: zeynep@gmail.com");
print("\nRestaurants:");
print("  - Kasap Usta Steakhouse (Kadıköy)");
print("  - La Piazza Ristorante (Beşiktaş)");
print("  - Sakura Sushi Bar (Nişantaşı)");
print("\nCategories:");
print("  - Türk Mutfağı");
print("  - İtalyan");
print("  - Japon");
print("  - Fast Food");
print("  - Cafe & Kahvaltı");
print("\n5 Reviews and 5 Completed Reservations created.");
print("========================================");
