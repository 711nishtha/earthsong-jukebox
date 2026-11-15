import { mount } from 'svelte';
import '../design/base.css';
import { applyTokens } from '../design/tokens';
import Page from './Quiz.svelte';

// Tokens become CSS variables before anything renders.
applyTokens();

export default mount(Page, { target: document.getElementById('app')! });
