
'use strict';

exports.DATABASE_URL = 'mongodb+srv://my-first-atlas-db-yegb9.mongodb.net/my-kitchen?retryWrites=true&w=majority'
exports.PORT = process.env.PORT || 8000;
exports.JWT_SECRET = process.env.JWT_SECRET;
exports.JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';