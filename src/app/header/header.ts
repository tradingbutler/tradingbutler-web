import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TbLogo } from '../shared/tb-logo';

@Component({
    selector: 'app-header',
    imports: [RouterLink, TbLogo],
    templateUrl: './header.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './header.scss',
})
export class Header {}
