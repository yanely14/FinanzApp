import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PinService } from '../services/pin.service';

export const pinGuard: CanActivateFn = async () => {
  const pinService = inject(PinService);
  const router = inject(Router);

  if (pinService.desbloqueado) return true;
  if (!(await pinService.pinActivo())) return true;

  return router.parseUrl('/bloqueo');
};
