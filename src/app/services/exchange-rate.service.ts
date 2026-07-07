import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ExchangeRateService {

  private url = 'https://open.er-api.com/v6/latest/USD';

  constructor(private http: HttpClient) {}

  obtenerTasaDolar(): Observable<number> {
    return this.http.get<any>(this.url).pipe(
      map((respuesta: any) => respuesta.rates.DOP)
    );
  }
}
