# Push Notifications Setup Guide

## 🚨 **Current Issue: HTTPS Required**

You're currently on `http:` but push notifications require `https:` or `localhost`.

## ✅ **Solutions:**

### Option 1: Use Localhost (Recommended for Development)
```bash
# Start your dashboard on localhost
npm run dev
# or
yarn dev
```

Then visit: `http://localhost:3000` (localhost works with HTTP)

### Option 2: Use HTTPS in Development
```bash
# Install mkcert for local HTTPS
brew install mkcert  # macOS
# or
choco install mkcert  # Windows

# Create local CA
mkcert -install

# Generate certificates
mkcert localhost 127.0.0.1 ::1

# Start with HTTPS
npm run dev -- --https
```

### Option 3: Use ngrok for HTTPS Tunnel
```bash
# Install ngrok
npm install -g ngrok

# Start your app
npm run dev

# In another terminal, create HTTPS tunnel
ngrok http 3000

# Use the HTTPS URL provided by ngrok
```

### Option 4: Deploy to Production
Deploy to Vercel, Netlify, or your hosting provider with HTTPS enabled.

## 🔧 **After Fixing HTTPS:**

1. **Visit your HTTPS URL**
2. **Go to notifications page**
3. **Check debug info** - Should show:
   - ✅ Notification API
   - ✅ Service Worker  
   - ✅ Push Manager
   - ✅ HTTPS
4. **Click "Test Service Worker"** - Should register successfully
5. **Click "Test Notification"** - Should show browser notification

## 📱 **Browser Support:**

| Browser | HTTP | HTTPS | Localhost |
|---------|------|-------|-----------|
| Chrome | ❌ | ✅ | ✅ |
| Firefox | ❌ | ✅ | ✅ |
| Edge | ❌ | ✅ | ✅ |
| Safari | ❌ | ✅ | ✅ |

## 🐛 **Troubleshooting:**

### "Service workers not supported"
- **Cause:** HTTP protocol
- **Fix:** Use HTTPS or localhost

### "Notification permission denied"
- **Cause:** User denied permission or HTTP protocol
- **Fix:** Use HTTPS/localhost + grant permission

### "Push notifications are NOT supported"
- **Cause:** Missing APIs or HTTP protocol
- **Fix:** Use modern browser + HTTPS/localhost

## 🚀 **Quick Test:**

1. **Start with localhost:**
   ```bash
   npm run dev
   ```
   
2. **Visit:** `http://localhost:3000/dashboard/teams/[slug]/user/account/notifications`

3. **Check debug info** - Should all be green ✅

4. **Test buttons** - Should work without errors

## 📋 **Production Checklist:**

- [ ] HTTPS enabled (not HTTP)
- [ ] Service worker file accessible (`/sw.js`)
- [ ] VAPID keys configured
- [ ] Database migration applied
- [ ] Push subscription API working
- [ ] Test notification working

## 🔐 **Security Note:**

Push notifications require HTTPS for security reasons:
- Prevents man-in-the-middle attacks
- Ensures subscription endpoints are secure
- Required by browser vendors

This is a browser security requirement, not a limitation of our implementation.
