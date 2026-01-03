const express = require('express');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const helmet = require('helmet');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');

const app = express();
const PORT = process.env.PORT || 3000;

// Data Loading
const activitiesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'activities.january-2026.json'), 'utf8'));
const translations = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'translations.json'), 'utf8'));
let rsvps = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'rsvps.json'), 'utf8'));

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://www.paypal.com", "https://js.stripe.com", "https://cdnjs.cloudflare.com"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com", "https://fonts.googleapis.com"],
            "img-src": ["'self'", "data:", "https://*"],
            "frame-src": ["'self'", "https://www.paypal.com", "https://js.stripe.com"],
            "connect-src": ["'self'", "https://www.paypal.com", "https://api.stripe.com"],
        },
    },
}));

// Cookie Parser for language preference (simple way)
const cookieParser = require('cookie-parser');
app.use(cookieParser());

app.use(compression());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Translation helper middleware
app.use((req, res, next) => {
    try {
        const lang = req.query.lang || req.cookies.lang || 'en';
        res.cookie('lang', lang);
        res.locals.lang = lang;
        res.locals.t = (key) => {
            const group = translations[lang] || translations['en'];
            return group[key] || key;
        };
        next();
    } catch (e) {
        console.error("Translation middleware error:", e);
        res.locals.lang = 'en';
        res.locals.t = (key) => key;
        next();
    }
});

// Custom Middleware for layout
app.use((req, res, next) => {
    res.renderWithLayout = (view, data = {}) => {
        // Explicitly include t and lang from res.locals
        const finalData = {
            t: res.locals.t,
            lang: res.locals.lang,
            ...data
        };

        res.render(view, finalData, (err, html) => {
            if (err) {
                console.error(`Error rendering inner view ${view}:`, err);
                return res.status(500).send(err.message);
            }
            res.render('layout', {
                ...finalData,
                body: html
            });
        });
    };
    next();
});

// Routes
app.get('/', (req, res) => {
    const featuredActivities = activitiesData.slice(0, 3);
    res.renderWithLayout('index', {
        title: res.locals.t('nav_home'),
        featuredActivities
    });
});

app.get('/calendar', (req, res) => {
    res.renderWithLayout('calendar', {
        title: res.locals.t('nav_calendar'),
        activities: activitiesData,
        rsvps
    });
});

app.post('/rsvp', async (req, res) => {
    const { name, email, activitySlug, avatar } = req.body;

    if (!rsvps[activitySlug]) rsvps[activitySlug] = [];

    // Check if member already RSVP'd (simple check by email)
    const existingRSVP = rsvps[activitySlug].find(r => r.email === email);

    if (!existingRSVP) {
        rsvps[activitySlug].push({ name, email, avatar: avatar || '😊' });
        fs.writeFileSync(path.join(__dirname, 'data', 'rsvps.json'), JSON.stringify(rsvps, null, 2));

        // Send confirmation email
        const activity = activitiesData.find(a => a.slug === activitySlug);

        try {
            await resend.emails.send({
                from: 'Murcia Welcomes You <hi@murciawelcomesyou.com>',
                to: email,
                subject: `You're in! ${activity.title} confirmed`,
                html: `
                    <div style="font-family: 'Quicksand', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background: #fef9f3; border-radius: 20px;">
                        <h1 style="color: #9b5de5; font-size: 2rem;">Hey ${name}! 🍋</h1>
                        <p style="font-size: 1.1rem; line-height: 1.8;">You're all set for <strong>${activity.title}</strong>!</p>
                        
                        <div style="background: white; padding: 30px; border-radius: 15px; margin: 30px 0;">
                            <p><strong>📅 When:</strong> ${activity.time}</p>
                            <p><strong>📍 Where:</strong> ${activity.location}</p>
                            <p><strong>🎭 Your vibe:</strong> ${avatar}</p>
                        </div>
                        
                        <p style="font-size: 1rem; line-height: 1.6;">
                            We'll send you a reminder the day before. If plans change, just reply to this email.
                        </p>
                        
                        <p style="margin-top: 30px; font-size: 0.95rem; color: #666;">
                            See you there!<br>
                            <strong>Asensio, Camilo & Ángel</strong><br>
                            Murcia Welcomes You
                        </p>
                    </div>
                `
            });
        } catch (error) {
            console.error('Email send error:', error);
            // Continue even if email fails - don't block the RSVP
        }
    }

});

app.get('/activities', (req, res) => {
    res.renderWithLayout('activities', {
        title: 'All Activities',
        activities: activitiesData
    });
});

app.get('/activities/:slug', (req, res) => {
    const activity = activitiesData.find(a => a.slug === req.params.slug);
    if (!activity) return res.status(404).send('Activity not found');

    res.renderWithLayout('activity-detail', {
        title: activity.title,
        activity,
        participants: rsvps[req.params.slug] || []
    });
});

app.get('/about', (req, res) => {
    res.renderWithLayout('about', { title: res.locals.t('nav_story') });
});

app.get('/membership', (req, res) => {
    const plans = [
        { id: 'single', name: 'Explorer Pass', price: 9, features: ['1 Special Event Access', 'Community Chat Access', 'Digital Guide'] },
        { id: 'full', name: 'January Reset Pass', price: 29, features: ['All 20+ Events', 'Welcome Drink', 'Exclusive Tote Bag', 'VIP Support'], popular: true },
        { id: 'annual', name: 'Legacy Member', price: 199, features: ['Whole Year 2026 Access', 'Partner Discounts', 'Monthly Private Dinners', 'MWY Jacket'] }
    ];
    res.renderWithLayout('membership', { title: 'Join the Community', plans });
});

app.post('/create-checkout-session', async (req, res) => {
    const { planId } = req.body;
    let price = 2900; // default 29.00
    let planName = 'January Reset Pass';

    if (planId === 'single') { price = 900; planName = 'Explorer Pass'; }
    if (planId === 'annual') { price = 19900; planName = 'Legacy Member'; }

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: { name: planName },
                    unit_amount: price,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${req.protocol}://${req.get('host')}/success`,
            cancel_url: `${req.protocol}://${req.get('host')}/membership`,
        });
        res.json({ id: session.id, url: session.url });
    } catch (error) {
        console.error('Stripe Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/success', (req, res) => {
    res.renderWithLayout('success', { title: 'Payment Successful' });
});

app.get('/contact', (req, res) => {
    res.renderWithLayout('contact', { title: 'Contact Us' });
});

app.post('/contact', (req, res) => {
    const { name, email, message } = req.body;
    console.log(`Contact Submission: ${name} (${email}) - ${message}`);
    res.renderWithLayout('thanks', { title: 'Thank You', name });
});

app.get('/privacy', (req, res) => {
    res.renderWithLayout('privacy', { title: 'Privacy Policy' });
});

app.get('/legal', (req, res) => {
    res.renderWithLayout('legal', { title: 'Legal Notice' });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
