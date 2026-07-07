import { TestBed } from '@angular/core/testing';

import { ExchangeRate } from './exchange-rate';

describe('ExchangeRate', () => {
  let service: ExchangeRate;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExchangeRate);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
