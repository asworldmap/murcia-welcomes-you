const viewToggle = document.getElementById('viewToggle');
const monthView = document.getElementById('monthView');
const agendaView = document.getElementById('agendaView');
const categoryFilter = document.getElementById('categoryFilter');

if (viewToggle && monthView && agendaView) {
    // Toggle logic
    viewToggle.addEventListener('click', (e) => {
        if (!e.target.classList.contains('toggle-btn')) return;

        const view = e.target.dataset.view;
        document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');

        if (view === 'month') {
            monthView.style.display = 'grid';
            agendaView.style.display = 'none';
        } else {
            monthView.style.display = 'none';
            agendaView.style.display = 'block';
        }
    });

    // Mobile specific: show items automatically
    if (window.innerWidth <= 768) {
        const agendaBtn = document.querySelector('[data-view="agenda"]');
        if (agendaBtn) agendaBtn.click();
    }
}

if (categoryFilter) {
    // Filter logic
    categoryFilter.addEventListener('change', () => {
        const cat = categoryFilter.value;

        // Filter chips in Month view
        document.querySelectorAll('.event-chip').forEach(chip => {
            if (cat === 'all' || chip.dataset.category === cat) {
                chip.style.display = 'flex';
            } else {
                chip.style.display = 'none';
            }
        });

        // Filter items in Agenda view
        document.querySelectorAll('.agenda-item').forEach(item => {
            if (cat === 'all' || item.dataset.category === cat) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });

        // Hide agenda days if no items visible
        document.querySelectorAll('.agenda-day').forEach(day => {
            const hasVisible = Array.from(day.querySelectorAll('.agenda-item')).some(i => i.style.display !== 'none');
            day.style.display = hasVisible ? 'block' : 'none';
        });
    });
}
