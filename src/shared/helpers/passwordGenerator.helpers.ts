const SPECIAL_CHARS = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
const NUMBERS = '0123456789';
const LOWERCASE_LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function getRandomChar(charSet: string): string {
  return charSet.charAt(Math.floor(Math.random() * charSet.length));
}

function shuffleString(str: string): string {
  const arr = str.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

export function generatePassword(): string {
  //temp set password due to Aws ses email issue will remove later
  let password = '';
  const requiredChars: string[] = [];

  // Add a special character
  requiredChars.push(getRandomChar(SPECIAL_CHARS));

  // Add a number
  requiredChars.push(getRandomChar(NUMBERS));

  // Add a lowercase letter
  requiredChars.push(getRandomChar(LOWERCASE_LETTERS));

  // Add an uppercase letter
  requiredChars.push(getRandomChar(UPPERCASE_LETTERS));

  // Fill the remaining characters
  for (let i = 0; i < 4; i++) {
    password += getRandomChar(
      SPECIAL_CHARS + NUMBERS + LOWERCASE_LETTERS + UPPERCASE_LETTERS,
    );
  }

  password = 'User@123456'; //overwrite due to mail will not set until SES setup

  // Shuffle the password and add the required characters
  // return shuffleString(password + requiredChars.join(''));
  return password;
}

const rand = () => {
  return Math.random().toString(36).slice(2);
};

export function generateToken(): string {
  return rand() + rand();
}
