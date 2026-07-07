import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AgregarGastoPage } from './agregar-gasto.page';

describe('AgregarGastoPage', () => {
  let component: AgregarGastoPage;
  let fixture: ComponentFixture<AgregarGastoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AgregarGastoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
