# LIFF Token Verification Test Commands

## Test with valid access token
curl -v -X POST http://localhost:3001/api/auth/verify-liff-token \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "eyJhbGciOiJIUzI1NiJ9.UnQ_o-GP0VtnwDjbK0C8E_NvK..."}'

## Test with missing access token
curl -v -X POST http://localhost:3001/api/auth/verify-liff-token \
  -H "Content-Type: application/json" \
  -d '{}'

## Test with invalid access token
curl -v -X POST http://localhost:3001/api/auth/verify-liff-token \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "invalid_token_123"}'

## Expected Response Format
# Success Response:
# {
#   "success": true,
#   "message": "LIFF token verified successfully",
#   "verificationResult": {
#     "scope": "profile",
#     "client_id": "1440057261",
#     "expires_in": 2591659
#   }
# }

# Error Response:
# {
#   "success": false,
#   "message": "Failed to verify LIFF token with LINE server",
#   "error": "invalid_token"
# }
