const express = require('express');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com", "https://fonts.googleapis.com"],
            "img-src": ["'self'", "data:", "https://*"],
        },
    },
}));
app.use(compression());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Data
const activitiesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'activities.january-2026.json'), 'utf8'));

// Custom Middleware for layout
app.use((req, res, next) => {
    res.renderWithLayout = (view, data) => {
        res.render(view, { ...data }, (err, html) => {
            if (err) return next(err);
            res.render('layout', {
                ...data,
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
        title: 'Home',
        featuredActivities
    });
});

app.get('/calendar', (req, res) => {
    res.renderWithLayout('calendar', {
        title: 'January 2026 Calendar',
        activities: activitiesData
    });
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
        activity
    });
});

app.get('/about', (req, res) => {
    res.renderWithLayout('about', { title: 'Our Story' });
});

app.get('/privacy', (req, res) => {
    res.renderWithLayout('privacy', { title: 'Privacy Policy' });
});

app.get('/legal', (req, res) => {
    res.renderWithLayout('legal', { title: 'Legal Notice' });
});

app.get('/terms', (req, res) => {
    res.renderWithLayout('legal', { title: 'Terms of Service' });
});

app.get('/contact', (req, res) => {
    res.renderWithLayout('contact', { title: 'Contact Us' });
});

app.post('/contact', (req, res) => {
    const { name, email, subject, message } = req.body;
    console.log(`Contact Form Submission: ${name} (${email}) - ${subject}`);
    // Here you would typically send an email
    res.send('<script>alert("Thank you! We have received your message."); window.location.href="/";</script>');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
