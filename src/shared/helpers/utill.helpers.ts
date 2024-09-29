// Function to generate a 4-digit random number
function generateRandomNumber(length) {
  let randomNumber = '';
  for (let i = 0; i < length; i++) {
    randomNumber += Math.floor(Math.random() * 10).toString();
  }
  return randomNumber;
}

// Function to generate the unique 6-digit ID with "SY" prefix
export function generateUniqueId(id = 0) {
  const idLength = String(id).length;
  const randomNumberLength = 4 - idLength;
  const timestamp = Date.now().toString().slice(-2); // Get the last 2 digits of the timestamp
  const randomNumber = generateRandomNumber(randomNumberLength); // Generate a random number based on id length
  const uniqueNumber = `${timestamp}${id}${randomNumber}`; // Concatenate the components to form a 6-digit number
  const uniqueId = `SY${uniqueNumber}`; // Prefix with "SY"
  return uniqueId;
}

export function groupByArray<T, K extends keyof any>(
  array: T[],
  getKey: (item: T) => K,
): Record<K, T[]> {
  return array.reduce((acc, item) => {
    const key = getKey(item);

    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<K, T[]>);
}
