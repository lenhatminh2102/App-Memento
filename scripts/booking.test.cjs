const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadBookings(client) {
  const filename = path.join(__dirname, '../src/lib/bookings.ts');
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { exports: module.exports, module, require: name => {
    if (name === './supabase') return { supabase: client };
    if (name === './serviceCategories') return { categoryLabel: value => value };
    throw new Error(`Unexpected dependency: ${name}`);
  }, Date, Intl, URL, URLSearchParams, console });
  return module.exports;
}
const input = { client_id: 'client', photographer_user_id: 'photographer', photographer_id: 1, photographer_name: 'Photographer', photographer_avatar: null, package_name: 'Portrait', package_price: 1000001, package_category: 'photo', booking_date: '2027-01-01', start_time: '09:00', end_time: '11:00', client_note: null };

test('Server failure cannot create a successful booking locally', async () => {
  const bookings = loadBookings({ from: () => ({ insert: () => ({ select: () => ({ single: async () => ({ data: null, error: { message: 'network unavailable' } }) }) }) }) });
  const result = await bookings.createBooking(input);
  assert.equal(result.data, null);
  assert.equal(result.error, 'network unavailable');
});
test('A photographer cannot book themselves, including before a server request', async () => {
  const bookings = loadBookings({ from: () => { throw new Error('Must not call backend'); } });
  const result = await bookings.createBooking({ ...input, client_id: 'photographer' });
  assert.equal(result.data, null);
  assert.ok(result.error);
});
test('A successful booking preserves the 20/80 payment split without rounding loss', async () => {
  let payload;
  const bookings = loadBookings({ from: () => ({ insert: row => { payload = row; return { select: () => ({ single: async () => ({ data: { ...row, id: 'booking-id' }, error: null }) }) }; } }) });
  const result = await bookings.createBooking(input);
  assert.equal(result.error, null);
  assert.equal(payload.deposit_amount, 200000);
  assert.equal(payload.deposit_amount + payload.remaining_amount, input.package_price);
  assert.equal(payload.payment_status, 'unpaid');
  assert.equal(payload.status, 'pending');
});
test('A failed server read is reported instead of displaying an empty calendar', async () => {
  const bookings = loadBookings({ from: () => ({ select: () => ({ or: () => ({ order: async () => ({ data: null, error: { message: 'permission denied' } }) }) }) }) });
  await assert.rejects(bookings.fetchMyBookings('client'), /permission denied/);
});
