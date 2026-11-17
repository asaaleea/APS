'use strict';

const FLIGHTS = [
  { id: 'F1', asal: 'Malang', tujuan: 'Jakarta', tanggal: '2026-12-01', jam: '07:00', maskapai: 'Garuda', harga: 1450000 },
  { id: 'F2', asal: 'Malang', tujuan: 'Jakarta', tanggal: '2026-12-01', jam: '13:30', maskapai: 'Citilink', harga: 980000 },
  { id: 'F3', asal: 'Malang', tujuan: 'Denpasar', tanggal: '2026-12-02', jam: '09:15', maskapai: 'Lion Air', harga: 760000 },
  { id: 'F4', asal: 'Surabaya', tujuan: 'Denpasar', tanggal: '2026-12-02', jam: '15:45', maskapai: 'Garuda', harga: 1100000 },
  { id: 'F5', asal: 'Jakarta', tujuan: 'Medan', tanggal: '2026-12-03', jam: '06:20', maskapai: 'Batik Air', harga: 1250000 },
  { id: 'F6', asal: 'Surabaya', tujuan: 'Yogyakarta', tanggal: '2026-12-03', jam: '11:00', maskapai: 'Citilink', harga: 640000 },
];

const LEAVES = [
  { nama: 'Sari', mulai: '2026-12-10', selesai: '2026-12-14', status: 'diajukan' },
  { nama: 'Budi', mulai: '2026-12-20', selesai: '2026-12-31', status: 'diajukan' },
  { nama: 'Sari', mulai: '2026-03-02', selesai: '2026-03-04', status: 'selesai' },
  { nama: 'Dewi', mulai: '2026-07-06', selesai: '2026-07-10', status: 'selesai' },
];
const LEAVE_BALANCE = { Sari: 8, Budi: 5, Dewi: 12 };
const STATUSES = ['confirmed', 'booked', 'waiting for the payment'];
const REQUIRED_PROFILE = ['nama', 'paspor', 'telepon', 'tglLahir'];

const state = {
  bookings: [],
  emails: [],
  profile: { nama: '', paspor: '', telepon: '', tglLahir: '' },
  seq: 1,
};

/* ---------- helpers ---------- */
const rupiah = (n) => 'Rp ' + n.toLocaleString('id-ID');
const dayCount = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000) + 1;

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node[k] = v;
  });
  children.flat().forEach((c) => node.append(c));
  return node;
}

function field(label, input) {
  return el('label', {}, label, input);
}

function table(headers, rows) {
  const head = el('tr', {}, headers.map((h) => el('th', { textContent: h })));
  const body = rows.map((r) => {
    const tr = el('tr', { className: r.className || '' });
    r.cells.forEach((c) => tr.append(el('td', {}, c)));
    return tr;
  });
  return el('table', {}, el('thead', {}, head), el('tbody', {}, body));
}

function card(title, us, ...nodes) {
  return el('section', {}, el('h2', {}, title + ' ', el('small', { textContent: us })), nodes);
}

function message(text, isError) {
  return el('div', { className: isError ? 'msg error' : 'msg', textContent: text });
}

function showIn(box, node) {
  box.replaceChildren(node);
}

/* ---------- domain logic ---------- */
function searchFlights({ asal = '', tujuan = [], tanggal = '', jam = '' }) {
  const wanted = tujuan.map((t) => t.trim().toLowerCase()).filter(Boolean);
  return FLIGHTS.filter((f) =>
    (!asal || f.asal.toLowerCase() === asal.trim().toLowerCase()) &&
    (!wanted.length || wanted.includes(f.tujuan.toLowerCase())) &&
    (!tanggal || f.tanggal === tanggal) &&
    (!jam || f.jam >= jam));
}

function createBooking(flight, owner, bookedBy) {
  const kode = 'BK' + String(state.seq++).padStart(4, '0');
  const booking = { kode, flight, owner, bookedBy, status: 'waiting for the payment', noTiket: null };
  state.bookings.push(booking);
  return booking;
}

function issueTicket(booking, status) {
  booking.status = status;
  booking.noTiket = 'TKT-' + booking.kode;
  state.emails.push({ to: booking.owner, text: 'E-tiket ' + booking.noTiket + ' ' + booking.flight.tujuan });
}

function profileMissing() {
  return REQUIRED_PROFILE.filter((k) => !state.profile[k].trim());
}

/* ---------- reusable widgets ---------- */
function flightTable(flights, onPick, pickLabel, highlightCheapest) {
  if (!flights.length) return message('Tidak ada penerbangan yang sesuai.', true);
  const cheapest = Math.min(...flights.map((f) => f.harga));
  const rows = flights.map((f) => ({
    className: highlightCheapest && f.harga === cheapest ? 'best' : '',
    cells: [f.asal + ' → ' + f.tujuan, f.tanggal + ' ' + f.jam, f.maskapai, rupiah(f.harga),
      onPick ? el('button', { textContent: pickLabel, onclick: () => onPick(f) }) : ''],
  }));
  return table(['Rute', 'Jadwal', 'Maskapai', 'Harga', ''], rows);
}

function searchForm(fields, onSearch) {
  const inputs = fields.map((f) => el('input', { type: f.type || 'text', placeholder: f.hint || '', name: f.name }));
  const form = el('form', { onsubmit: (e) => {
    e.preventDefault();
    const values = {};
    inputs.forEach((i) => { values[i.name] = i.value; });
    onSearch(values);
  } }, fields.map((f, i) => field(f.label, inputs[i])), el('button', { textContent: 'Cari' }));
  return form;
}

function bookingTable(list, actions) {
  if (!list.length) return message('Belum ada pesanan.');
  return table(['Kode', 'Atas nama', 'Penerbangan', 'Status', 'Tiket', ''],
    list.map((b) => ({ cells: [b.kode, b.owner, b.flight.tujuan + ' ' + b.flight.tanggal, b.status, b.noTiket || '-', actions ? actions(b) : ''] })));
}

/* ---------- role views ---------- */
function viewHrd() {
  const out = el('div');
  const detail = el('div');
  const form = searchForm([{ name: 'bulan', label: 'Bulan', type: 'month' }], ({ bulan }) => {
    const list = LEAVES.filter((l) => !bulan || l.mulai.startsWith(bulan));
    showIn(out, list.length ? table(['Pegawai', 'Periode', 'Lama', 'Aksi'], list.map((l) => ({
      cells: [l.nama, l.mulai + ' s/d ' + l.selesai, dayCount(l.mulai, l.selesai) + ' hari',
        el('button', { className: 'secondary', textContent: 'Riwayat & sisa', onclick: () => showHistory(l.nama) })],
    }))) : message('Tidak ada pengajuan cuti pada periode ini.', true));
  });
  function showHistory(nama) {
    const hist = LEAVES.filter((l) => l.nama === nama && l.status === 'selesai');
    showIn(detail, el('div', {}, el('h3', { textContent: 'Pegawai: ' + nama }),
      el('p', { textContent: 'Sisa cuti tahun berjalan: ' + LEAVE_BALANCE[nama] + ' hari' }),
      hist.length ? table(['Periode', 'Lama'], hist.map((l) => ({ cells: [l.mulai + ' s/d ' + l.selesai, dayCount(l.mulai, l.selesai) + ' hari'] })))
        : message('Belum ada riwayat cuti.')));
  }
  return [card('Pengajuan cuti pegawai', 'US1.1–US1.5', form, out, detail)];
}

function bookingWidget(owner, bookedBy) {
  const box = el('div');
  const refresh = () => showIn(box, bookingTable(state.bookings.filter((b) => b.owner === owner), (b) =>
    b.status === 'confirmed' ? '' : el('button', { className: 'secondary', textContent: 'Batalkan', onclick: () => {
      state.bookings = state.bookings.filter((x) => x.kode !== b.kode);
      refresh();
    } })));
  refresh();
  return { box, refresh };
}

function viewPassenger() {
  const results = el('div');
  const mine = bookingWidget('Calon penumpang', 'Calon penumpang');
  const pick = (f) => { createBooking(f, 'Calon penumpang', 'Calon penumpang'); mine.refresh(); };
  const single = searchForm([{ name: 'tujuan', label: 'Tujuan', hint: 'mis. Jakarta' }],
    ({ tujuan }) => showIn(results, flightTable(searchFlights({ tujuan: [tujuan] }), pick, 'Pesan')));
  const multi = searchForm([{ name: 'tujuan', label: 'Beberapa tujuan', hint: 'Jakarta, Denpasar' }],
    ({ tujuan }) => showIn(results, flightTable(searchFlights({ tujuan: tujuan.split(',') }), pick, 'Pesan')));
  return [card('Cari jadwal penerbangan', 'US2.1, US2.2', single, results),
    card('Cari untuk beberapa tujuan', 'US3', multi),
    card('Pesanan saya', 'US2.3', mine.box)];
}

function viewMember() {
  const results = el('div');
  const status = el('div');
  const mine = bookingWidget('Member', 'Member');
  const pick = (f) => { createBooking(f, 'Member', 'Member'); mine.refresh(); };
  const multi = searchForm([{ name: 'tanggal', label: 'Tanggal', type: 'date' }, { name: 'asal', label: 'Keberangkatan' },
    { name: 'tujuan', label: 'Tujuan (pisah koma)' }],
  (v) => showIn(results, flightTable(searchFlights({ ...v, tujuan: v.tujuan.split(',') }), null, '', false)));
  const pref = searchForm([{ name: 'tujuan', label: 'Tujuan' }, { name: 'tanggal', label: 'Tanggal', type: 'date' },
    { name: 'jam', label: 'Jam mulai', type: 'time' }],
  (v) => showIn(results, flightTable(searchFlights({ ...v, tujuan: [v.tujuan] }), pick, 'Pesan', true)));
  const inputs = { nama: 'Nama', paspor: 'No. paspor', telepon: 'No. telepon', tglLahir: 'Tanggal lahir' };
  const profileFields = Object.entries(inputs).map(([k, label]) =>
    field(label, el('input', { value: state.profile[k], type: k === 'tglLahir' ? 'date' : 'text', oninput: (e) => { state.profile[k] = e.target.value; } })));
  const profile = el('form', { onsubmit: (e) => { e.preventDefault(); showIn(status, message('Data profil tersimpan.')); } },
    profileFields, el('button', { textContent: 'Simpan profil' }));
  const validate = el('button', { textContent: 'Validasi tiket pertama', onclick: () => {
    const missing = profileMissing();
    const target = state.bookings.find((b) => b.owner === 'Member' && b.status !== 'confirmed');
    if (missing.length) showIn(status, message('Data profil tidak lengkap. Lengkapi: ' + missing.join(', '), true));
    else if (!target) showIn(status, message('Tidak ada tiket yang perlu divalidasi.', true));
    else { issueTicket(target, 'confirmed'); mine.refresh(); showIn(status, message('Tiket ' + target.kode + ' tervalidasi.')); }
  } });
  return [card('Cari penerbangan multi-destinasi', 'US4', multi),
    card('Lihat, bandingkan harga, dan pesan', 'US6.1–US6.3 (harga termurah disorot)', pref, results),
    card('Data profil & validasi tiket', 'US5.1, US5.2', profile, validate, status),
    card('Pesanan saya', '', mine.box)];
}

function viewTravelManager() {
  const list = el('div');
  const result = el('div');
  const codeOut = el('div');
  const filter = el('select', { onchange: () => draw() }, el('option', { value: '', textContent: 'Semua status' }),
    STATUSES.map((s) => el('option', { value: s, textContent: s })));
  const draw = () => showIn(list, bookingTable(state.bookings.filter((b) => !filter.value || b.status === filter.value),
    (b) => (b.status === 'waiting for the payment' ? el('button', { className: 'secondary', textContent: 'Tandai dibayar', onclick: () => { b.status = 'booked'; draw(); } }) : '')));
  draw();
  const search = searchForm([{ name: 'tujuan', label: 'Tujuan' }], ({ tujuan }) =>
    showIn(result, flightTable(searchFlights({ tujuan: [tujuan] }), (f) => {
      const b = createBooking(f, 'Pengunjung', 'Manajer travel');
      issueTicket(b, 'booked');
      draw();
      showIn(result, message('Pesanan ' + b.kode + ' atas nama pengunjung tersimpan.'));
    }, 'Pesan untuk pengunjung')));
  const codeForm = searchForm([{ name: 'kode', label: 'Kode booking reference' }], ({ kode }) => {
    const found = state.bookings.find((b) => b.kode === kode.trim().toUpperCase());
    showIn(codeOut, found ? message('Status booking ' + found.kode + ': ' + found.status)
      : message('Kode booking reference tidak sesuai. Silakan ulangi input.', true));
  });
  return [card('Status booking', 'US7.1, US7.2', el('div', { className: 'row' }, field('Filter', filter)), list),
    card('Cari & pesan tiket untuk pengunjung', 'US8.1, US8.2', search, result),
    card('Periksa kode booking', 'US9', codeForm, codeOut)];
}

function viewVisitor() {
  const mine = state.bookings.filter((b) => b.owner === 'Pengunjung');
  const mails = state.emails.filter((m) => m.to === 'Pengunjung');
  return [card('Tiket di akun saya', 'US8.3', bookingTable(mine)),
    card('E-tiket terkirim ke email', 'US8.4', mails.length
      ? table(['Pesan'], mails.map((m) => ({ cells: [m.text] }))) : message('Belum ada e-tiket.'))];
}

/* ---------- bootstrap ---------- */
const ROLES = {
  'HRD manajer': viewHrd,
  'Calon penumpang': viewPassenger,
  'Member frequent traveller': viewMember,
  'Manajer travel': viewTravelManager,
  'Pengunjung': viewVisitor,
};

function render() {
  const select = document.getElementById('role');
  document.getElementById('view').replaceChildren(...ROLES[select.value]());
}

const roleSelect = document.getElementById('role');
Object.keys(ROLES).forEach((r) => roleSelect.append(el('option', { value: r, textContent: r })));
roleSelect.addEventListener('change', render);
render();