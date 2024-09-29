//eslint-disable-next-line
require('dotenv').config();

export const JWT_SECRET = process.env.JWT_SIGNATURE;
export const JWT_EXPIRY_SECONDS = 86400; //24 hrs
export const REFRESH_TOKEN_EXPIRY_SECONDS = 604800; //7 days

export const DEFAULT_PAGE_LIMIT = 10;
export const MAX_PAGE_LIMIT = 1000;

export const DEFAULT_SORT_BY = 'id';

export const API_PREFIX = '/api/v1';

//Regex
export const PHONE_REGEX = /^[0-9\s+-.()]+$/;

export const SLUG_SEPARATOR = '-';

export const MAX_FILE_SIZE = 10485760; // Maximum file size in bytes
export const ALLOWED_FILE_TYPES =
  /^(image\/jpeg|image\/jpg|image\/png|application\/pdf|application\/msword|application\/vnd.openxmlformats-officedocument.wordprocessingml.document|application\/vnd.ms-powerpoint|application\/vnd.openxmlformats-officedocument.presentationml.presentation|application\/vnd.ms-excel|application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet)$/i;
