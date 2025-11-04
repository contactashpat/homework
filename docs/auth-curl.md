# Authentication cURL Examples

Set up environment variables used in the examples:

```bash
export API_ROOT="http://localhost:4000"
export USERNAME="admin@example.com"
export PASSWORD="admin123"
```

## Login

```bash
curl -s -X POST "$API_ROOT/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"'$USERNAME'","password":"'$PASSWORD'"}'
```

The response contains `accessToken` (valid 15 minutes) and `refreshToken` (valid 7 days).

## Access Protected Resource

```bash
ACCESS_TOKEN="$(curl -s -X POST "$API_ROOT/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"'$USERNAME'","password":"'$PASSWORD'"}' | jq -r '.accessToken')"

curl -s "$API_ROOT/collections" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

## Refresh Tokens

```bash
REFRESH_TOKEN="$(curl -s -X POST "$API_ROOT/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"'$USERNAME'","password":"'$PASSWORD'"}' | jq -r '.refreshToken')"

curl -s -X POST "$API_ROOT/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"'$REFRESH_TOKEN'"}'
```

## Logout (Revoke Refresh Token)

```bash
curl -s -X POST "$API_ROOT/auth/logout" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"'$REFRESH_TOKEN'"}'
```
