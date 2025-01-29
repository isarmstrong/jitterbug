'use client';

import { useState } from 'react';
import { Tab } from '@headlessui/react';
import { TabNav, tabs, type TabId } from './TabNav';
import { createJitterbug } from '@isarmstrong/jitterbug';
import { ConsoleTransport } from '@isarmstrong/jitterbug/transports/console';

// Create a dedicated logger for the debug panel itself
const debugPanelLogger = createJitterbug({
    namespace: 'jitterbug-debug-panel',
    transports: [
        new ConsoleTransport({
            colors: true
        })
    ]
});

export function DebugPanel() {
    const [activeTab, setActiveTab] = useState<TabId>('welcome');
    const selectedIndex = tabs.findIndex((tab: { id: TabId }) => tab.id === activeTab);

    // Log panel initialization
    debugPanelLogger.info('Debug panel initialized', {
        initialTab: activeTab,
        source: 'debug-panel'
    });

    const handleTabChange = (index: number) => {
        const newTab = tabs[index].id;
        debugPanelLogger.debug('Tab changed', {
            from: activeTab,
            to: newTab,
            source: 'debug-panel'
        });
        setActiveTab(newTab);
    };

    return (
        <div className="jitterbug-debug">
            <div className="jitterbug-debug-header">
                <header>
                    <div className="jitterbug-debug-container">
                        <h1 className="jitterbug-debug-title">
                            Jitterbug Debug Console
                        </h1>
                    </div>
                </header>
                <main className="jitterbug-debug-main">
                    <Tab.Group selectedIndex={selectedIndex} onChange={handleTabChange}>
                        <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
                        <div className="jitterbug-debug-container">
                            <Tab.Panels className="jitterbug-debug-tab-panels">
                                <Tab.Panel>
                                    <div className="jitterbug-debug-panel">
                                        <h2>Welcome to Jitterbug</h2>
                                        <p>
                                            This debug console helps you test, configure, and monitor your Jitterbug instance.
                                            Use the tabs above to navigate between different sections.
                                        </p>
                                    </div>
                                </Tab.Panel>

                                <Tab.Panel>
                                    <div className="jitterbug-debug-panel">
                                        <h2>Documentation</h2>
                                        <p>
                                            Learn how to use Jitterbug effectively in your Next.js application.
                                        </p>
                                    </div>
                                </Tab.Panel>

                                <Tab.Panel>
                                    <div className="jitterbug-debug-panel">
                                        <h2>Configuration</h2>
                                        <p>
                                            View and modify your current Jitterbug configuration.
                                        </p>
                                    </div>
                                </Tab.Panel>

                                <Tab.Panel>
                                    <div className="jitterbug-debug-panel">
                                        <h2>Test Console</h2>
                                        <p>
                                            Test your Jitterbug integration and view logs in real-time.
                                        </p>
                                    </div>
                                </Tab.Panel>
                            </Tab.Panels>
                        </div>
                    </Tab.Group>
                </main>
            </div>
        </div>
    );
} 
