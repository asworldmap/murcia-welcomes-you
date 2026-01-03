# Murcia Welcomes You - Email Setup Guide

## ✅ What's Done
- ✅ Resend library installed
- ✅ Email confirmation system integrated
- ✅ Beautiful HTML email template created
- ✅ Signed by "Asensio, Camilo & Ángel"

## 🔑 What You Need to Do (5 minutes)

### Step 1: Create Resend Account (FREE)
1. Go to: https://resend.com/signup
2. Sign up with your email
3. Verify your email address

### Step 2: Get Your API Key
1. Go to: https://resend.com/api-keys
2. Click "Create API Key"
3. Name it: "MWY Production"
4. Copy the key (starts with `re_...`)

### Step 3: Add Domain to Resend
1. Go to: https://resend.com/domains
2. Click "Add Domain"
3. Enter: `murciawelcomesyou.com`
4. Follow instructions to add DNS records (they'll show you exactly what to add)

### Step 4: Add API Key to Server
SSH into your server and create `.env` file:

```bash
ssh root@145.223.34.110
cd /var/www/murcia-welcomes-you
nano .env
```

Add this line (replace with your real key):
```
RESEND_API_KEY=re_YourActualKeyHere
```

Save (Ctrl+X, Y, Enter)

Restart the app:
```bash
pm2 restart mwy-professional
```

## 📧 What Happens Now

When someone RSVPs:
1. They fill the form with name, email, and avatar
2. System saves their RSVP
3. **Instantly sends them a beautiful confirmation email** with:
   - Activity details
   - Their chosen avatar
   - Warm message from the team
   - Reminder that they can reply if plans change

## 🎯 Free Tier Limits
- **3,000 emails/month** (more than enough for your community)
- No credit card required
- Professional delivery rates

## 🚀 Ready to Test?
Once you add the API key, try RSVPing to an activity on the website. You should receive a confirmation email within seconds!

---
Need help? The Resend dashboard is super simple and has great docs.
