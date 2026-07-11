import { decimalTransformer } from './service.entity';

// node-postgres returns NUMERIC columns as strings; this transformer is what
// converts them back to numbers on read (and passes numbers through unchanged
// on write). A mocked repository never actually invokes column transformers,
// so this has to be tested directly against the transformer itself — going
// through ServicesService with a mock would prove nothing about this logic.
describe('decimalTransformer', () => {
  describe('to (JS -> DB, on write)', () => {
    it('passes a number through unchanged', () => {
      expect(decimalTransformer.to(49.99)).toBe(49.99);
    });

    it('passes undefined through unchanged', () => {
      expect(decimalTransformer.to(undefined)).toBeUndefined();
    });
  });

  describe('from (DB -> JS, on read)', () => {
    it('parses the string Postgres returns for a NUMERIC column into a number', () => {
      expect(decimalTransformer.from('49.99')).toBe(49.99);
    });

    it('parses a whole-number string correctly', () => {
      expect(decimalTransformer.from('100')).toBe(100);
    });

    it('passes null through unchanged rather than parsing it into NaN', () => {
      expect(decimalTransformer.from(null)).toBeNull();
    });

    it('passes undefined through unchanged', () => {
      expect(decimalTransformer.from(undefined)).toBeUndefined();
    });
  });
});
