'use client';

import { Tab } from '@headlessui/react';
import { classNames } from '../../lib/utils';

export const tabs = [
    { name: 'Welcome', id: 'welcome' },
    { name: 'Documentation', id: 'docs' },
    { name: 'Configuration', id: 'config' },
    { name: 'Test Console', id: 'test' },
] as const;

export type TabId = typeof tabs[number]['id'];

interface TabNavProps {
    activeTab: TabId;
    onTabChange: (tabId: TabId) => void;
}

export function TabNav({ activeTab, onTabChange }: TabNavProps) {
    const handleTabChange = (index: number) => {
        onTabChange(tabs[index].id);
    };

    const selectedIndex = tabs.findIndex(tab => tab.id === activeTab);

    return (
        <div className="jitterbug-debug-container">
            <Tab.Group selectedIndex={selectedIndex} onChange={handleTabChange}>
                <Tab.List className="jitterbug-debug-tab-list">
                    {tabs.map((tab) => (
                        <Tab
                            key={tab.id}
                            className={({ selected }: { selected: boolean }) =>
                                classNames(
                                    'jitterbug-debug-tab',
                                    selected
                                        ? 'jitterbug-debug-tab-selected'
                                        : 'jitterbug-debug-tab-hover'
                                )
                            }
                        >
                            {tab.name}
                        </Tab>
                    ))}
                </Tab.List>
            </Tab.Group>
        </div>
    );
} 
