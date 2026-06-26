import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrokerRanking } from './broker-ranking';

describe('BrokerRanking', () => {
  let component: BrokerRanking;
  let fixture: ComponentFixture<BrokerRanking>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrokerRanking],
    }).compileComponents();

    fixture = TestBed.createComponent(BrokerRanking);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
