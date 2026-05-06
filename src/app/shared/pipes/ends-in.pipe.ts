import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'endsIn', standalone: true, pure: true })
export class EndsInPipe implements PipeTransform {
  transform(endDate: string | null | undefined): string {
    if (!endDate) return '';
    const end = new Date(endDate).getTime();
    const now = Date.now();
    const diff = end - now;
    if (diff <= 0) return 'Ended';
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days === 1) return 'Ends in 1 Day';
    return `Ends in ${days} Days`;
  }
}
