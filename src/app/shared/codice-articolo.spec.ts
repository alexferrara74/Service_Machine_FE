import { proponiCodiceArticolo } from './codice-articolo';

describe('codice articolo proposto', () => {
  it('builds it from the serial number, uppercase and without odd characters', () => {
    expect(proponiCodiceArticolo('m-1001', [])).toBe('ATT-M-1001');
    expect(proponiCodiceArticolo('ab 12/3', [])).toBe('ATT-AB123');
  });

  it('adds a number when the code already exists, ignoring case', () => {
    expect(proponiCodiceArticolo('M-1', ['att-m-1'])).toBe('ATT-M-1-2');
    expect(proponiCodiceArticolo('M-1', ['ATT-M-1', 'ATT-M-1-2'])).toBe('ATT-M-1-3');
  });

  it('stays within the 50 characters the catalog accepts, even with a long serial number', () => {
    const codice = proponiCodiceArticolo('X'.repeat(100), ['ATT-' + 'X'.repeat(46)]);
    expect(codice.length).toBeLessThanOrEqual(50);
    expect(codice).not.toBe('ATT-' + 'X'.repeat(46));
  });
});
