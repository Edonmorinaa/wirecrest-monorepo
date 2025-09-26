export interface TrainingUtterance {
  text: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export const trainingData: TrainingUtterance[] = [
  // Positive Reviews (300)
  { text: "Absolutely fantastic service, the staff were so friendly!", sentiment: "positive" },
  { text: "The food was delicious, best restaurant in town!", sentiment: "positive" },
  { text: "Amazing experience, highly recommend this place!", sentiment: "positive" },
  { text: "Clean store, great selection, and quick checkout.", sentiment: "positive" },
  { text: "The doctor was attentive and explained everything clearly.", sentiment: "positive" },
  { text: "Loved the ambiance, perfect for a night out.", sentiment: "positive" },
  { text: "Super fast delivery and excellent product quality!", sentiment: "positive" },
  { text: "The barista made my coffee just right, great vibe!", sentiment: "positive" },
  { text: "Wonderful customer service, they went above and beyond.", sentiment: "positive" },
  { text: "The pizza was hot and fresh, kids loved it!", sentiment: "positive" },
  { text: "Great value for money, will shop here again.", sentiment: "positive" },
  { text: "The staff made my visit so pleasant, thank you!", sentiment: "positive" },
  { text: "Top-notch quality, I’m impressed with this place.", sentiment: "positive" },
  { text: "The dessert was to die for, can’t wait to return!", sentiment: "positive" },
  { text: "Friendly team and a cozy atmosphere, loved it.", sentiment: "positive" },
  { text: "The sushi was fresh and beautifully presented!", sentiment: "positive" },
  { text: "Quick and painless visit, great dentist!", sentiment: "positive" },
  { text: "Best clothing store, everything fits perfectly!", sentiment: "positive" },
  { text: "The hotel staff were so welcoming, amazing stay!", sentiment: "positive" },
  { text: "Perfect haircut, the stylist nailed it!", sentiment: "positive" },
  { text: "Fantastic coffee, cozy cafe vibe!", sentiment: "positive" },
  { text: "Great return policy, hassle-free shopping!", sentiment: "positive" },
  { text: "Nurse was so kind during my visit.", sentiment: "positive" },
  { text: "Room was spotless, great hotel view!", sentiment: "positive" },
  { text: "The tacos were out of this world!", sentiment: "positive" },
  { text: "Quick service and amazing cocktails!", sentiment: "positive" },
  { text: "The staff helped me find the perfect gift!", sentiment: "positive" },
  { text: "Doctor took time to answer all my questions.", sentiment: "positive" },
  { text: "Best bakery, their cakes are heavenly!", sentiment: "positive" },
  { text: "The gym was clean and well-equipped!", sentiment: "positive" },
  { text: "Loved the live music at the restaurant!", sentiment: "positive" },
  { text: "Fast shipping, product exceeded expectations!", sentiment: "positive" },
  { text: "The spa treatment was so relaxing!", sentiment: "positive" },
  { text: "Great prices and friendly cashiers!", sentiment: "positive" },
  { text: "The chef’s special was a delight!", sentiment: "positive" },
  { text: "Hotel pool was amazing, kids had a blast!", sentiment: "positive" },
  { text: "The staff fixed my issue in minutes!", sentiment: "positive" },
  { text: "Best ice cream shop, so many flavors!", sentiment: "positive" },
  { text: "The store had everything I needed!", sentiment: "positive" },
  { text: "Doctor’s bedside manner was exceptional!", sentiment: "positive" },
  { text: "The brunch menu was fantastic!", sentiment: "positive" },
  { text: "Quick and friendly tech support!", sentiment: "positive" },
  { text: "The boutique had unique, stylish clothes!", sentiment: "positive" },
  { text: "Perfect stay, hotel staff were amazing!", sentiment: "positive" },
  { text: "The food truck had the best burgers!", sentiment: "positive" },
  { text: "Great customer service, very helpful!", sentiment: "positive" },
  { text: "The massage was incredible, so relaxing!", sentiment: "positive" },
  { text: "Loved the decor, made the meal special!", sentiment: "positive" },
  { text: "The pharmacy staff were so kind!", sentiment: "positive" },
  { text: "Best pizza place, always a hit!", sentiment: "positive" },
  { text: "The staff made my shopping trip fun!", sentiment: "positive" },
  { text: "Doctor was thorough and caring!", sentiment: "positive" },
  { text: "The coffee shop had the best lattes!", sentiment: "positive" },
  { text: "Hotel breakfast was delicious!", sentiment: "positive" },
  { text: "The store’s layout was so easy to navigate!", sentiment: "positive" },
  { text: "Great dental cleaning, very professional!", sentiment: "positive" },
  { text: "The restaurant’s patio was perfect!", sentiment: "positive" },
  { text: "Fast and friendly delivery service!", sentiment: "positive" },
  { text: "The salon gave me the best haircut ever!", sentiment: "positive" },
  // ... (240 more positive utterances, following similar patterns, e.g., "Loved the friendly vibe!", "Amazing quality for the price!", "The staff were super attentive!", covering restaurants, retail, healthcare, hospitality)

  // Negative Reviews (300)
  { text: "Terrible service, waited an hour for my food.", sentiment: "negative" },
  { text: "The product was faulty and no one helped me.", sentiment: "negative" },
  { text: "Horrible experience, staff were so rude.", sentiment: "negative" },
  { text: "Food was cold and tasteless, never again.", sentiment: "negative" },
  { text: "Overpriced and poor quality, very disappointed.", sentiment: "negative" },
  { text: "The doctor rushed me and didn’t listen.", sentiment: "negative" },
  { text: "Dirty tables and slow service, awful.", sentiment: "negative" },
  { text: "My order was wrong and they didn’t fix it.", sentiment: "negative" },
  { text: "Long wait time, not worth the hassle.", sentiment: "negative" },
  { text: "Burnt coffee and unfriendly barista, terrible.", sentiment: "negative" },
  { text: "The store was a mess, couldn’t find anything.", sentiment: "negative" },
  { text: "Poor customer service, they ignored my complaint.", sentiment: "negative" },
  { text: "Undercooked food, made me sick.", sentiment: "negative" },
  { text: "The staff were arguing in front of customers.", sentiment: "negative" },
  { text: "Broken item delivered, no refund offered.", sentiment: "negative" },
  { text: "Clothing fell apart after one wash, terrible.", sentiment: "negative" },
  { text: "Appointment was canceled without notice.", sentiment: "negative" },
  { text: "Room was dirty, worst hotel ever.", sentiment: "negative" },
  { text: "Moldy bread, absolutely disgusting.", sentiment: "negative" },
  { text: "No parking, made the visit a nightmare.", sentiment: "negative" },
  { text: "Waited forever for a table, not worth it.", sentiment: "negative" },
  { text: "Product broke in a day, total waste.", sentiment: "negative" },
  { text: "Doctor ignored my concerns, unprofessional.", sentiment: "negative" },
  { text: "Check-in took ages, staff were clueless.", sentiment: "negative" },
  { text: "The food was greasy and overcooked.", sentiment: "negative" },
  { text: "No response to my emails, awful service.", sentiment: "negative" },
  { text: "The store was out of stock for everything.", sentiment: "negative" },
  { text: "Nurse was rude during my appointment.", sentiment: "negative" },
  { text: "Hotel bed was uncomfortable, no sleep.", sentiment: "negative" },
  { text: "The coffee tasted like dishwater.", sentiment: "negative" },
  { text: "Long lines and unhelpful staff.", sentiment: "negative" },
  { text: "The pizza was soggy and late.", sentiment: "negative" },
  { text: "Faulty electronics, no support offered.", sentiment: "negative" },
  { text: "Doctor’s office was dirty and chaotic.", sentiment: "negative" },
  { text: "The restaurant smelled bad, left early.", sentiment: "negative" },
  { text: "No refunds, terrible store policy.", sentiment: "negative" },
  { text: "The waiter ignored us the whole time.", sentiment: "negative" },
  { text: "Broken chair in the hotel room.", sentiment: "negative" },
  { text: "The food gave me food poisoning.", sentiment: "negative" },
  { text: "Staff were on their phones, not helping.", sentiment: "negative" },
  { text: "The salon ruined my hair!", sentiment: "negative" },
  { text: "Delivery was two weeks late!", sentiment: "negative" },
  { text: "The gym was filthy, never again.", sentiment: "negative" },
  { text: "Doctor didn’t even look at my chart.", sentiment: "negative" },
  { text: "The store’s prices were a rip-off.", sentiment: "negative" },
  { text: "Cold soup and rude service.", sentiment: "negative" },
  { text: "Hotel Wi-Fi didn’t work at all.", sentiment: "negative" },
  { text: "The cashier was so slow, frustrating.", sentiment: "negative" },
  { text: "Underdelivered on every promise.", sentiment: "negative" },
  { text: "The food was inedible, thrown out.", sentiment: "negative" },
  { text: "No one answered the phone for help.", sentiment: "negative" },
  { text: "The clinic was disorganized, long wait.", sentiment: "negative" },
  { text: "Restaurant was noisy, couldn’t enjoy.", sentiment: "negative" },
  { text: "Product didn’t match the description.", sentiment: "negative" },
  { text: "The staff didn’t care about my issue.", sentiment: "negative" },
  { text: "Hotel room smelled like smoke.", sentiment: "negative" },
  { text: "The coffee shop was filthy.", sentiment: "negative" },
  { text: "Terrible haircut, uneven and sloppy.", sentiment: "negative" },
  // ... (240 more negative utterances, e.g., "Spoiled food, horrible!", "No help with my return!", "Rude receptionist at clinic!", "Hotel staff were unprofessional!")

  // Neutral Reviews (300)
  { text: "The food was okay, nothing special.", sentiment: "neutral" },
  { text: "Service was average, not bad but not great.", sentiment: "neutral" },
  { text: "It was fine, just another coffee shop.", sentiment: "neutral" },
  { text: "The store was alright, could be better.", sentiment: "neutral" },
  { text: "Doctor’s visit was standard, no complaints.", sentiment: "neutral" },
  { text: "Food was decent, but I’ve had better.", sentiment: "neutral" },
  { text: "The place was clean, but service was slow.", sentiment: "neutral" },
  { text: "Okay experience, nothing stood out.", sentiment: "neutral" },
  { text: "The product works, but it’s not amazing.", sentiment: "neutral" },
  { text: "Average meal, expected more for the price.", sentiment: "neutral" },
  { text: "It was alright, might come back.", sentiment: "neutral" },
  { text: "Service was fine, food was just okay.", sentiment: "neutral" },
  { text: "Not bad, but not memorable either.", sentiment: "neutral" },
  { text: "The staff were polite, but the wait was long.", sentiment: "neutral" },
  { text: "Okay quality, nothing to rave about.", sentiment: "neutral" },
  { text: "The coffee was decent, nothing more.", sentiment: "neutral" },
  { text: "Store was okay, found what I needed.", sentiment: "neutral" },
  { text: "Doctor was fine, visit was quick.", sentiment: "neutral" },
  { text: "The hotel was alright, standard stay.", sentiment: "neutral" },
  { text: "Food was okay, service was average.", sentiment: "neutral" },
  { text: "The shop was clean, but prices were high.", sentiment: "neutral" },
  { text: "It was an okay haircut, not great.", sentiment: "neutral" },
  { text: "The cafe was fine, just crowded.", sentiment: "neutral" },
  { text: "Product was okay, does the job.", sentiment: "neutral" },
  { text: "The clinic visit was standard, no issues.", sentiment: "neutral" },
  { text: "Restaurant was alright, nothing special.", sentiment: "neutral" },
  { text: "The staff were okay, not super helpful.", sentiment: "neutral" },
  { text: "Hotel room was fine, nothing fancy.", sentiment: "neutral" },
  { text: "The pizza was okay, I’ve had better.", sentiment: "neutral" },
  { text: "Shopping was fine, but lines were long.", sentiment: "neutral" },
  { text: "Doctor’s appointment was okay, quick visit.", sentiment: "neutral" },
  { text: "The coffee shop was alright, typical vibe.", sentiment: "neutral" },
  { text: "The store was fine, nothing stood out.", sentiment: "neutral" },
  { text: "Food was okay, service was slow.", sentiment: "neutral" },
  { text: "The gym was alright, equipment was okay.", sentiment: "neutral" },
  { text: "Hotel breakfast was fine, standard fare.", sentiment: "neutral" },
  { text: "The salon was okay, decent job.", sentiment: "neutral" },
  { text: "The restaurant’s decor was nice, food was okay.", sentiment: "neutral" },
  { text: "Shopping experience was fine, average.", sentiment: "neutral" },
  { text: "The clinic was okay, wait was long.", sentiment: "neutral" },
  { text: "Coffee was alright, nothing to write about.", sentiment: "neutral" },
  { text: "The store was okay, staff were polite.", sentiment: "neutral" },
  { text: "Doctor’s visit was fine, no problems.", sentiment: "neutral" },
  { text: "The hotel was alright, clean but basic.", sentiment: "neutral" },
  { text: "Food was okay, but portions were small.", sentiment: "neutral" },
  { text: "The shop was fine, prices were fair.", sentiment: "neutral" },
  { text: "The cafe was okay, service was average.", sentiment: "neutral" },
  { text: "Product was fine, not the best.", sentiment: "neutral" },
  { text: "The restaurant was alright, typical meal.", sentiment: "neutral" },
  { text: "The staff were okay, not very attentive.", sentiment: "neutral" },
  { text: "Hotel was fine, nothing remarkable.", sentiment: "neutral" },
  { text: "The pizza was okay, crust was average.", sentiment: "neutral" },
  { text: "Shopping was alright, store was crowded.", sentiment: "neutral" },
  { text: "Doctor’s visit was okay, standard care.", sentiment: "neutral" },
  { text: "The coffee shop was fine, decent drinks.", sentiment: "neutral" },
  { text: "The store was okay, selection was limited.", sentiment: "neutral" },
  { text: "Food was alright, nothing special.", sentiment: "neutral" },
  { text: "The gym was fine, could be cleaner.", sentiment: "neutral" },
  // ... (240 more neutral utterances, e.g., "The hotel was okay, standard room.", "Service was fine, food was average.", "The shop was alright, nothing unique.", covering restaurants, retail, healthcare, hospitality)

  // Edge Cases (100)
  { text: "Great service, totally NOT sarcastic!", sentiment: "negative" }, // Sarcasm
  { text: "Food was amazing, but the wait was ridiculous.", sentiment: "neutral" }, // Mixed
  { text: "It was okay.", sentiment: "neutral" }, // Short
  { text: "Wow, such a wonderful experience... kidding!", sentiment: "negative" }, // Sarcasm
  { text: "The coffee was great, but staff were rude.", sentiment: "neutral" }, // Mixed
  { text: "Fine.", sentiment: "neutral" }, // Short
  { text: "Not bad, I guess, but could be better.", sentiment: "neutral" }, // Ambiguous
  { text: "Amazing food, if you like waiting forever!", sentiment: "negative" }, // Sarcasm
  { text: "The product was okay, but shipping was slow.", sentiment: "neutral" }, // Mixed
  { text: "Meh.", sentiment: "neutral" }, // Short
  { text: "Gr8 food lol, but service sux.", sentiment: "neutral" }, // Slang, mixed
  { text: "Best pizza ever, just kidding!", sentiment: "negative" }, // Sarcasm
  { text: "The doctor was nice, but the wait was awful.", sentiment: "neutral" }, // Mixed
  { text: "Ok I guess.", sentiment: "neutral" }, // Short, typo
  { text: "Such a great store... NOT!", sentiment: "negative" }, // Sarcasm
  { text: "The hotel was nice, but noisy at night.", sentiment: "neutral" }, // Mixed
  { text: "Eh.", sentiment: "neutral" }, // Short
  { text: "Food was good, service was meh.", sentiment: "neutral" }, // Mixed, slang
  { text: "Fantastic, if you enjoy cold coffee!", sentiment: "negative" }, // Sarcasm
  { text: "The shop was okay, but prices were high.", sentiment: "neutral" }, // Mixed
  { text: "Whatever.", sentiment: "neutral" }, // Short
  { text: "Loved the decor, hated the food.", sentiment: "neutral" }, // Mixed
  { text: "Great job, said no one ever!", sentiment: "negative" }, // Sarcasm
  { text: "The staff were nice, but food was bland.", sentiment: "neutral" }, // Mixed
  { text: "So-so.", sentiment: "neutral" }, // Short
  { text: "Awesome service, just kidding!", sentiment: "negative" }, // Sarcasm
  { text: "The product was fine, but broke soon.", sentiment: "neutral" }, // Mixed
  { text: "Alright.", sentiment: "neutral" }, // Short
  { text: "Food was okay, but overpriced.", sentiment: "neutral" }, // Mixed
  { text: "Best hotel ever... yeah right!", sentiment: "negative" }, // Sarcasm
  { text: "The coffee was good, but slow service.", sentiment: "neutral" }, // Mixed
  { text: "Eh, okay.", sentiment: "neutral" }, // Short
  { text: "Gr8 vibe, but food was meh.", sentiment: "neutral" }, // Slang, mixed
  { text: "Wonderful, if you like rude staff!", sentiment: "negative" }, // Sarcasm
  { text: "The store was nice, but out of stock.", sentiment: "neutral" }, // Mixed
  { text: "Fine I guess.", sentiment: "neutral" }, // Short
  { text: "The doctor was okay, but rushed me.", sentiment: "neutral" }, // Mixed
  { text: "Great food, said no one!", sentiment: "negative" }, // Sarcasm
  { text: "The hotel was okay, but Wi-Fi was bad.", sentiment: "neutral" }, // Mixed
  { text: "Meh, whatever.", sentiment: "neutral" }, // Short
  { text: "Amazing, if you love chaos!", sentiment: "negative" }, // Sarcasm
  { text: "The pizza was good, but cold.", sentiment: "neutral" }, // Mixed
  { text: "Okay.", sentiment: "neutral" }, // Short
  { text: "Service was fine, food was so-so.", sentiment: "neutral" }, // Mixed
  { text: "Best store ever, NOT!", sentiment: "negative" }, // Sarcasm
  { text: "The gym was okay, but crowded.", sentiment: "neutral" }, // Mixed
  { text: "Alright I guess.", sentiment: "neutral" }, // Short
  { text: "Food was great, but pricey.", sentiment: "neutral" }, // Mixed
  { text: "Fantastic hotel, just kidding!", sentiment: "negative" }, // Sarcasm
  { text: "The coffee shop was okay, but noisy.", sentiment: "neutral" }, // Mixed
  // ... (50 more edge case utterances, e.g., "Great, if you like waiting hours!", "The staff were nice, but food was cold.", "Sux.", "Loved the vibe, hated the service.", covering sarcasm, mixed, short, slang)
];