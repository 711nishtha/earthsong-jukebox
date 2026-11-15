import { mount } from 'svelte';
import App from './App.svelte';
import './design/base.css';
import { applyTokens } from './design/tokens';

// Tokens become CSS variables before anything renders.
applyTokens();

export default mount(App, { target: document.getElementById('app')! });
