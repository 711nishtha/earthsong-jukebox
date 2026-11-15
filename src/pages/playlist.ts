import { mount } from 'svelte';
import Page from './Playlist.svelte';
import '../ui/theme.css';

export default mount(Page, { target: document.getElementById('app')! });
