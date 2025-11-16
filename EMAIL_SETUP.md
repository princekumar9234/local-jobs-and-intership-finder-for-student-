# Email Configuration Setup

Application form के लिए email भेजने के लिए, आपको email configuration करनी होगी।

## Gmail के लिए Setup:

1. **Gmail App Password बनाएं:**
   - Google Account में जाएं
   - Security settings में जाएं
   - "2-Step Verification" enable करें
   - "App passwords" में जाएं
   - एक नया app password बनाएं

2. **Environment Variables सेट करें:**
   
   `.env` file में ये variables add करें:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password-here
   EMPLOYER_EMAIL=employer@company.com
   ```

## अन्य Email Services:

अगर आप Gmail नहीं use करना चाहते, तो `routes/application.js` में transporter configuration बदलें:

### Outlook/Hotmail:
```javascript
const transporter = nodemailer.createTransport({
  service: 'outlook',
  auth: {
    user: 'your-email@outlook.com',
    pass: 'your-password'
  }
});
```

### Yahoo:
```javascript
const transporter = nodemailer.createTransport({
  service: 'yahoo',
  auth: {
    user: 'your-email@yahoo.com',
    pass: 'your-app-password'
  }
});
```

### Custom SMTP:
```javascript
const transporter = nodemailer.createTransport({
  host: 'smtp.example.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your-email@example.com',
    pass: 'your-password'
  }
});
```

## Testing:

Server start करने के बाद, application form submit करके test करें। Email successfully भेजा जाएगा।

**Note:** Development में, आप email service के बिना भी test कर सकते हैं - form submit होगा, लेकिन email नहीं भेजा जाएगा।

