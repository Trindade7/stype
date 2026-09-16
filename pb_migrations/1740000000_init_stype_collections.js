/// <reference path="../pb_data/types.d.ts" />

migrate(
	(app) => {
		const saveCol = (col) => {
			if (typeof app.save === 'function') {
				app.save(col);
			} else if (typeof Dao !== 'undefined') {
				Dao(app).saveCollection(col);
			}
		};

		const settings = new Collection({
			name: 'settings',
			type: 'base',
			listRule: '@request.auth.id != "" && user = @request.auth.id',
			viewRule: '@request.auth.id != "" && user = @request.auth.id',
			createRule: '@request.auth.id != "" && user = @request.auth.id',
			updateRule: '@request.auth.id != "" && user = @request.auth.id',
			deleteRule: '@request.auth.id != "" && user = @request.auth.id',
			schema: [
				{
					name: 'user',
					type: 'relation',
					required: true,
					options: {
						collectionId: '_pb_users_auth_',
						cascadeDelete: true,
						maxSelect: 1
					}
				},
				{
					name: 'mode',
					type: 'text',
					required: false
				},
				{
					name: 'duration',
					type: 'number',
					required: false
				},
				{
					name: 'passage_length',
					type: 'text',
					required: false
				},
				{
					name: 'zen_mode',
					type: 'bool',
					required: false
				},
				{
					name: 'theme',
					type: 'text',
					required: false
				},
				{
					name: 'scroll_mode',
					type: 'text',
					required: false
				},
				{
					name: 'deleted_at',
					type: 'text',
					required: false
				}
			],
			indexes: ['CREATE UNIQUE INDEX idx_settings_user ON settings (user)']
		});
		settings.fields = settings.schema;

		const customPassages = new Collection({
			name: 'custom_passages',
			type: 'base',
			listRule: '@request.auth.id != "" && user = @request.auth.id',
			viewRule: '@request.auth.id != "" && user = @request.auth.id',
			createRule: '@request.auth.id != "" && user = @request.auth.id',
			updateRule: '@request.auth.id != "" && user = @request.auth.id',
			deleteRule: '@request.auth.id != "" && user = @request.auth.id',
			schema: [
				{
					name: 'user',
					type: 'relation',
					required: true,
					options: {
						collectionId: '_pb_users_auth_',
						cascadeDelete: true,
						maxSelect: 1
					}
				},
				{
					name: 'client_id',
					type: 'text',
					required: false
				},
				{
					name: 'text',
					type: 'text',
					required: true
				},
				{
					name: 'source',
					type: 'text',
					required: false
				},
				{
					name: 'deleted_at',
					type: 'text',
					required: false
				}
			],
			indexes: ['CREATE INDEX idx_custom_passages_user ON custom_passages (user)']
		});
		customPassages.fields = customPassages.schema;

		const testRuns = new Collection({
			name: 'test_runs',
			type: 'base',
			listRule: '@request.auth.id != "" && user = @request.auth.id',
			viewRule: '@request.auth.id != "" && user = @request.auth.id',
			createRule: '@request.auth.id != "" && user = @request.auth.id',
			updateRule: '@request.auth.id != "" && user = @request.auth.id',
			deleteRule: '@request.auth.id != "" && user = @request.auth.id',
			schema: [
				{
					name: 'user',
					type: 'relation',
					required: true,
					options: {
						collectionId: '_pb_users_auth_',
						cascadeDelete: true,
						maxSelect: 1
					}
				},
				{
					name: 'client_id',
					type: 'text',
					required: true
				},
				{
					name: 'passage_id',
					type: 'text',
					required: true
				},
				{
					name: 'mode',
					type: 'text',
					required: true
				},
				{
					name: 'duration',
					type: 'number',
					required: false
				},
				{
					name: 'wpm',
					type: 'number',
					required: true
				},
				{
					name: 'accuracy',
					type: 'number',
					required: true
				},
				{
					name: 'time_elapsed',
					type: 'number',
					required: true
				},
				{
					name: 'correct_chars',
					type: 'number',
					required: true
				},
				{
					name: 'incorrect_chars',
					type: 'number',
					required: true
				},
				{
					name: 'extra_chars',
					type: 'number',
					required: true
				},
				{
					name: 'missed_chars',
					type: 'number',
					required: true
				},
				{
					name: 'timeline_snapshots',
					type: 'json',
					required: false
				},
				{
					name: 'created_at',
					type: 'text',
					required: false
				},
				{
					name: 'passage',
					type: 'json',
					required: false
				}
			],
			indexes: [
				'CREATE INDEX idx_test_runs_client_id ON test_runs (client_id)',
				'CREATE UNIQUE INDEX idx_test_runs_user_client_id ON test_runs (user, client_id)'
			]
		});
		testRuns.fields = testRuns.schema;

		saveCol(settings);
		saveCol(customPassages);
		saveCol(testRuns);
	},
	(app) => {
		const findCol = (name) => {
			if (typeof app.findCollectionByNameOrId === 'function') {
				return app.findCollectionByNameOrId(name);
			}
			if (typeof Dao !== 'undefined') {
				return Dao(app).findCollectionByNameOrId(name);
			}
			return null;
		};

		const deleteCol = (col) => {
			if (!col) return;
			if (typeof app.delete === 'function') {
				app.delete(col);
			} else if (typeof Dao !== 'undefined') {
				Dao(app).deleteCollection(col);
			}
		};

		deleteCol(findCol('settings'));
		deleteCol(findCol('custom_passages'));
		deleteCol(findCol('test_runs'));
	}
);
