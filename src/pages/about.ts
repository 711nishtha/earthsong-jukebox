import { mount } from 'svelte';
import Page from './About.svelte';
import '../ui/theme.css';

export default mount(Page, { target: document.getElementById('app')! });
