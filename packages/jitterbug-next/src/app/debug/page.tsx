import { debug } from '../../';

export const metadata = {
    title: 'Jitterbug Debug Console',
    description: 'Debug and monitor your Jitterbug instance',
};

export default async function JitterbugDebugPage() {
    const { DebugPanel } = await debug.getDebugComponents();
    return <DebugPanel />;
} 
