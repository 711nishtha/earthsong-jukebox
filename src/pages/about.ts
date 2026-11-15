import { mount } from 'svelte';
import Page from './About.svelte';
import '../design/base.css';
import { applyTokens } from '../design/tokens';

// Tokens become CSS variables before anything renders.
applyTokens();

export default mount(Page, { target: document.getElementById('app')! });
