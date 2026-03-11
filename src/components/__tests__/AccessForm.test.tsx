import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { AccessForm } from '../AccessForm';
import { IdentityService } from '../../services/identity/IdentityService';

// Mock IdentityService
vi.mock('../../services/identity/IdentityService', () => ({
    IdentityService: {
        fetchIdentities: vi.fn()
    }
}));

// Mock Sonner
vi.mock('sonner', () => ({
    toast: {
        warning: vi.fn(),
        success: vi.fn(),
        error: vi.fn()
    }
}));

// Mock inner components so we don't have to deal with their complex internal state in this integration test
vi.mock('../access-form/SelectedObjectsList', () => ({
    SelectedObjectsList: () => <div data-testid="selected-objects-list" />
}));

vi.mock('../access-form/PrincipalSelector', () => ({
    PrincipalSelector: ({ onTogglePrincipal }: any) => (
        <button data-testid="trigger-principal" onClick={() => onTogglePrincipal('test_user_id')}>
            Toggle Principal
        </button>
    )
}));

vi.mock('../access-form/PermissionSelector', () => ({
    PermissionSelector: ({ onTogglePermission }: any) => (
        <button data-testid="trigger-permission" onClick={() => onTogglePermission('SELECT')}>
            Toggle Permission
        </button>
    )
}));

vi.mock('../access-form/ConstraintSelector', () => ({
    ConstraintSelector: ({ onJustificationChange }: any) => (
        <div data-testid="constraint-selector">
            <input
                placeholder="mock business justification"
                onChange={(e) => onJustificationChange(e.target.value)}
            />
        </div>
    )
}));

describe('AccessForm Component Integration', () => {
    const mockOnSubmit = vi.fn();
    const mockOnClear = vi.fn();
    const mockSelectedObjects = [{ id: '1', name: 'catalog1', type: 'catalog' }];

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default identity response
        (IdentityService.fetchIdentities as any).mockResolvedValue({
            users: [{ id: 'test_user_id', name: 'Test User' }],
            groups: [],
            servicePrincipals: []
        });
    });

    it('should render the form layout and child components successfully', async () => {
        render(
            <AccessForm
                selectedObjects={mockSelectedObjects}
                onClearSelection={mockOnClear}
                onSubmit={mockOnSubmit}
            />
        );

        // Wait for asynchronous identity fetching
        await waitFor(() => {
            expect(IdentityService.fetchIdentities).toHaveBeenCalledTimes(1);
        });

        // Verify key structural components are present
        expect(screen.getByText('Access Request')).toBeInTheDocument();
        expect(screen.getByTestId('selected-objects-list')).toBeInTheDocument();
        expect(screen.getByTestId('trigger-principal')).toBeInTheDocument();
        expect(screen.getByTestId('trigger-permission')).toBeInTheDocument();
        expect(screen.getByTestId('constraint-selector')).toBeInTheDocument();
    });

    it('should validate requires fields and call onSubmit when completed', async () => {
        const user = userEvent.setup();
        render(
            <AccessForm
                selectedObjects={mockSelectedObjects}
                onClearSelection={mockOnClear}
                onSubmit={mockOnSubmit}
            />
        );

        // Interact with mocked child components to simulate selection
        await user.click(screen.getByTestId('trigger-principal'));
        await user.click(screen.getByTestId('trigger-permission'));

        // Interact with native textarea for justification
        const justificationBox = screen.getByPlaceholderText(/business justification/i);
        await user.type(justificationBox, 'Required access for the QA testing phase.');

        // Click Submit
        const submitBtn = screen.getByText(/Submit Provisioning Request/i);
        await user.click(submitBtn);

        // Verify the provided properties were transformed into the expected payload
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
        expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
            principals: ['test_user_id'],
            permissions: ['SELECT'],
            justification: 'Required access for the QA testing phase.',
            timeConstraint: expect.any(Object)
        }));
    });
});
