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

// Data Loading - New Structure
const activities = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'activities.json'), 'utf8'));
const events = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'events.json'), 'utf8'));
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
            "img-src": ["'self'", "data:", "https://*", "http://*"],
            "frame-src": ["'self'", "https://www.paypal.com", "https://js.stripe.com"],
            "connect-src": ["'self'", "https://www.paypal.com", "https://api.stripe.com"],
            "upgrade-insecure-requests": null
        },
    },
}));

const cookieParser = require('cookie-parser');
app.use(cookieParser());
app.use(compression());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Helpers
const getDetailedEvents = () => {
    return events.map(event => {
        const activity = activities.find(a => a.slug === event.activity_slug);
        return { ...activity, ...event };
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
};

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
        res.locals.lang = 'en';
        res.locals.t = (key) => key;
        next();
    }
});

// Layout helper
app.use((req, res, next) => {
    res.renderWithLayout = (view, data = {}) => {
        const finalData = { t: res.locals.t, lang: res.locals.lang, ...data };
        res.render(view, finalData, (err, html) => {
            if (err) return res.status(500).send(err.message);
            res.render('layout', { ...finalData, body: html });
        });
    };
    next();
});

// Routes
app.get('/', (req, res) => {
    const detailedEvents = getDetailedEvents();
    const upcomingEvents = detailedEvents.filter(e => new Date(e.date) >= new Date()).slice(0, 3);
    res.renderWithLayout('index', {
        title: res.locals.t('nav_home'),
        featuredActivities: upcomingEvents
    });
});

app.get('/calendar', (req, res) => {
    const detailedEvents = getDetailedEvents();
    res.renderWithLayout('calendar', {
        title: res.locals.t('nav_calendar'),
        events: detailedEvents,
        rsvps
    });
});

app.get('/activities', (req, res) => {
    // Show all activity templates with their next session
    const detailedEvents = getDetailedEvents();
    const activitiesWithNext = activities.map(activity => {
        const nextSession = detailedEvents.find(e => e.activity_slug === activity.slug && new Date(e.date) >= new Date());
        return { ...activity, nextSession };
    });
    res.renderWithLayout('activities', {
        title: 'All Activities',
        activities: activitiesWithNext
    });
});

app.get('/activities/:slug', (req, res) => {
    const activity = activities.find(a => a.slug === req.params.slug);
    if (!activity) return res.status(404).send('Activity not found');

    const detailedEvents = getDetailedEvents();
    const sessions = detailedEvents.filter(e => e.activity_slug === activity.slug && new Date(e.date) >= new Date());

    res.renderWithLayout('activity-detail', {
        title: activity.name,
        activity,
        sessions,
        rsvps
    });
});

app.get('/event/:id', (req, res) => {
    const event = events.find(e => e.id === req.params.id);
    if (!event) return res.status(404).send('Event not found');

    const activity = activities.find(a => a.slug === event.activity_slug);
    res.renderWithLayout('event-detail', {
        title: activity.name,
        event: { ...activity, ...event },
        participants: rsvps[event.id] || []
    });
});

app.post('/rsvp', async (req, res) => {
    const { name, email, eventId, avatar } = req.body;

    if (!rsvps[eventId]) rsvps[eventId] = [];
    const existingRSVP = rsvps[eventId].find(r => r.email === email);

    if (!existingRSVP) {
        rsvps[eventId].push({ name, email, avatar: avatar || '😊' });
        fs.writeFileSync(path.join(__dirname, 'data', 'rsvps.json'), JSON.stringify(rsvps, null, 2));

        const event = events.find(e => e.id === eventId);
        const activity = activities.find(a => a.slug === event.activity_slug);

        try {
            await resend.emails.send({
                from: 'Murcia Welcomes You <noreply@murciawelcomesyou.com>',
                to: email,
                bcc: 'asensios@activemarmenor.eu',
                replyTo: 'asensios@activemarmenor.eu',
                subject: `You're in! ${activity.name} confirmed`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background: #fef9f3; border-radius: 20px;">
                        <h1>Hey ${name}! 🍋</h1>
                        <p>You're all set for <strong>${activity.name}</strong>!</p>
                        <div style="background: white; padding: 30px; border-radius: 15px; margin: 30px 0;">
                            <p><strong>📅 When:</strong> ${event.date} at ${event.time}</p>
                            <p><strong>🎭 Your vibe:</strong> ${avatar}</p>
                        </div>
                        <p>See you there!</p>
                    </div>
                `
            });
        } catch (error) {
            console.error('Email send error:', error);
        }
    }
    res.redirect(`/event/${eventId}?success=true`);
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
    let price = 2900;
    let planName = 'January Reset Pass';

    if (planId === 'single') { price = 900; planName = 'Explorer Pass'; }
    if (planId === 'annual') { price = 19900; planName = 'Legacy Member'; }

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: { currency: 'eur', product_data: { name: planName }, unit_amount: price },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${req.protocol}://${req.get('host')}/success`,
            cancel_url: `${req.protocol}://${req.get('host')}/membership`,
        });
        res.json({ id: session.id, url: session.url });
    } catch (error) {
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
    res.renderWithLayout('thanks', { title: 'Thank You', name });
});

app.get('/privacy', (req, res) => {
    res.renderWithLayout('privacy', { title: 'Privacy Policy' });
});

app.get('/legal', (req, res) => {
    res.renderWithLayout('legal', { title: 'Legal Notice' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
