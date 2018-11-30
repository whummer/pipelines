/*
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as React from 'react';
import Compare, { TaggedViewerConfig } from './Compare';
import TestUtils from '../TestUtils';
import { ReactWrapper, ShallowWrapper, shallow } from 'enzyme';
import { Apis } from '../lib/Apis';
import { PageProps } from './Page';
import { QUERY_PARAMS } from '../lib/URLParser';
import { RoutePage } from '../components/Router';
import { ApiRunDetail } from '../apis/run';
import { StoragePath, StorageService } from '../lib/WorkflowParser';
import { PlotType } from '../components/viewers/Viewer';
import { OutputArtifactLoader } from '../lib/OutputArtifactLoader';

describe('Compare', () => {

  let tree: ReactWrapper | ShallowWrapper;

  // const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => null);
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => null);

  const updateToolbarSpy = jest.fn();
  const updateBannerSpy = jest.fn();
  const updateDialogSpy = jest.fn();
  const updateSnackbarSpy = jest.fn();
  const historyPushSpy = jest.fn();
  const getRunSpy = jest.spyOn(Apis.runServiceApi, 'getRun');

  const storagePath: StoragePath = { bucket: 'b', key: 'k', source: StorageService.GCS };

  let fileToRead = '';
  jest.spyOn(Apis, 'readFile').mockImplementation(() => fileToRead);

  function generateProps(): PageProps {
    return {
      history: { push: historyPushSpy } as any,
      location: {
        pathname: RoutePage.COMPARE,
        search: `?${QUERY_PARAMS.runlist}=${MOCK_RUN_1_ID},${MOCK_RUN_2_ID},${MOCK_RUN_3_ID}`
      } as any,
      match: { params: {} } as any,
      toolbarProps: Compare.prototype.getInitialToolbarState(),
      updateBanner: updateBannerSpy,
      updateDialog: updateDialogSpy,
      updateSnackbar: updateSnackbarSpy,
      updateToolbar: updateToolbarSpy,
    };
  }

  const MOCK_RUN_1_ID = 'mock-run-1-id';
  const MOCK_RUN_2_ID = 'mock-run-2-id';
  const MOCK_RUN_3_ID = 'mock-run-3-id';

  let runs: ApiRunDetail[] = [];

  function newMockRun(id?: string): ApiRunDetail {
    return {
      pipeline_runtime: {
        workflow_manifest: '{}',
      },
      run: {
        id: id || 'test-run-id',
        name: 'test run ' + id,
      }
    };
  }

  // async function mockNRuns(n: number): Promise<void> {
  //   listRunsSpy.mockImplementation(() => ({
  //     runs: range(n).map(i => ({ id: 'test-run-id' + i, name: 'test run name' + i })),
  //   }));
  //   await listRunsSpy;
  //   await TestUtils.flushPromises();
  // }

  beforeEach(async () => {
    // Reset mocks
    // consoleLogSpy.mockReset();
    consoleErrorSpy.mockReset();
    updateBannerSpy.mockReset();
    updateDialogSpy.mockReset();
    updateSnackbarSpy.mockReset();
    updateToolbarSpy.mockReset();
    historyPushSpy.mockReset();

    getRunSpy.mockClear();

    runs = [newMockRun(MOCK_RUN_1_ID), newMockRun(MOCK_RUN_2_ID), newMockRun(MOCK_RUN_3_ID)];

    getRunSpy.mockImplementation((id: string) => runs.find((r) => r.run!.id === id));
  });

  afterEach(() => {
    tree.unmount();
  });

  it('clears banner upon initial load', () => {
    tree = shallow(<Compare {...generateProps()} />);
    expect(updateBannerSpy).toHaveBeenCalledTimes(1);
    expect(updateBannerSpy).toHaveBeenLastCalledWith({});
  });

  it('renders a page with no runs', async () => {
    const props = generateProps();
    // Ensure there are no run IDs in the query
    props.location.search = '';
    tree = shallow(<Compare {...props} />);
    await TestUtils.flushPromises();

    expect(tree).toMatchSnapshot();
  });
  it('renders a page with no runs', async () => {
    const props = generateProps();
    // Ensure there are no run IDs in the query
    props.location.search = '';
    tree = shallow(<Compare {...props} />);
    await TestUtils.flushPromises();

    expect(tree).toMatchSnapshot();
  });

  it('renders a page with multiple runs', async () => {
    const props = generateProps();
    // Ensure there are run IDs in the query
    props.location.search =
      `?${QUERY_PARAMS.runlist}=${MOCK_RUN_1_ID},${MOCK_RUN_2_ID},${MOCK_RUN_3_ID}`;

    tree = shallow(<Compare {...props} />);
    await TestUtils.flushPromises();
    expect(tree).toMatchSnapshot();
  });

  it('fetches a run for each ID in query params', async () => {
    runs.push(newMockRun('run-1'), newMockRun('run-2'), newMockRun('run-2'));
    const props = generateProps();
    props.location.search = `?${QUERY_PARAMS.runlist}=run-1,run-2,run-3`;

    tree = shallow(<Compare {...props} />);

    expect(getRunSpy).toHaveBeenCalledTimes(3);
    expect(getRunSpy).toHaveBeenCalledWith('run-1');
    expect(getRunSpy).toHaveBeenCalledWith('run-2');
    expect(getRunSpy).toHaveBeenCalledWith('run-3');
  });

  it('shows an error banner if fetching any run fails', async () => {
    TestUtils.makeErrorResponseOnce(getRunSpy, 'test error');

    tree = shallow(<Compare {...generateProps()} />);
    await TestUtils.flushPromises();

    expect(updateBannerSpy).toHaveBeenLastCalledWith(expect.objectContaining({
      additionalInfo: 'test error',
      message: 'Error: failed loading 1 runs. Click Details for more information.',
      mode: 'error',
    }));
  });

  it('shows an error banner indicating the number of getRun calls that failed', async () => {
    getRunSpy.mockImplementation(() => {
      throw {
        text: () => Promise.resolve('test error'),
      };
    });

    tree = shallow(<Compare {...generateProps()} />);
    await TestUtils.flushPromises();

    expect(updateBannerSpy).toHaveBeenLastCalledWith(expect.objectContaining({
      additionalInfo: 'test error',
      message: `Error: failed loading ${runs.length} runs. Click Details for more information.`,
      mode: 'error',
    }));
  });

  it('clears the error banner on refresh', async () => {
    TestUtils.makeErrorResponseOnce(getRunSpy, 'test error');

    tree = shallow(<Compare {...generateProps()} />);
    await TestUtils.flushPromises();

    // Verify that error banner is being shown
    expect(updateBannerSpy).toHaveBeenLastCalledWith(expect.objectContaining({ mode: 'error' }));

    (tree.instance() as Compare).refresh();

    // Error banner should be cleared
    expect(updateBannerSpy).toHaveBeenLastCalledWith({});
  });

  it('creates a map of viewers', async () => {
    const outputArtifactLoaderSpy = jest.spyOn(OutputArtifactLoader, 'load');
    // Data object representing a table used by the table viewer
    const data = [[ '{\"outputs\": [{\"format\":\"csv\"', 'header', '[\"col1', 'col2\"]', 'source', 'gs://path', 'type', 'table', '', '{\"source\":\"gs://path\"', 'type', 'tensorboard', ']}', ]];
    // Simulate returning a tensorboard and table viewer
    outputArtifactLoaderSpy.mockImplementation(() => [
      { type: 'tensorboard', url: 'gs://path' },
      { data, labels: ['col1, col2'], type: 'table' },
    ]);

    const workflow = {
      status: {
        nodes: {
          node1: {
            outputs: {
              artifacts: [{
                name: 'mlpipeline-ui-metadata',
                s3: { bucket: 'test bucket', key: 'test key' }
              }]
            }
          }
        }
      }
    };
    const run = newMockRun('run-with-workflow');
    run.pipeline_runtime!.workflow_manifest = JSON.stringify(workflow);
    runs.push(run);

    const props = generateProps();
    props.location.search = `?${QUERY_PARAMS.runlist}=${run.run!.id}`;

    tree = shallow(<Compare {...props} />);
    await TestUtils.flushPromises();

    const expectedViewerMap = new Map([
      [
        'table',
        [{
          config: { data, labels: ['col1, col2'], type: 'table' },
          runId: run.run!.id,
          runName: run.run!.name
        } as TaggedViewerConfig],
      ],
      [
        'tensorboard',
        [{
          config: { type: 'tensorboard', url: 'gs://path' },
          runId: run.run!.id,
          runName: run.run!.name
        } as TaggedViewerConfig]
      ],
    ]);
    expect((tree.state('viewersMap') as Map<PlotType, TaggedViewerConfig>))
      .toEqual(expectedViewerMap);

    expect(tree).toMatchSnapshot();

    outputArtifactLoaderSpy.mockRestore();
  });

  // it('creates a map of viewers', async () => {
  //   const tableMetadata = {
  //     format: 'csv',
  //     header: ['col1, col2'],
  //     source: 'gs://path',
  //     type: PlotType.TABLE,
  //   };
  //   const tensorboardMetadata = { source: 'gs://path', type: PlotType.TENSORBOARD };
  //   fileToRead = `{"outputs": ${JSON.stringify([tableMetadata, tensorboardMetadata])}}`;

  //   const workflow = {
  //     status: {
  //       nodes: {
  //         node1: {
  //           outputs: {
  //             artifacts: [{
  //               name: 'mlpipeline-ui-metadata',
  //               s3: { bucket: 'test bucket', key: 'test key' }
  //             }]
  //           }
  //         }
  //       }
  //     }
  //   };
  //   const run = newMockRun('run-with-workflow');
  //   run.pipeline_runtime!.workflow_manifest = JSON.stringify(workflow);
  //   runs.push(run);

  //   const props = generateProps();
  //   props.location.search = `?${QUERY_PARAMS.runlist}=${run.run!.id}`;

  //   tree = TestUtils.mountWithRouter(<Compare {...props} />);
  //   await TestUtils.flushPromises();

  //   const expectedViewerMap = new Map([
  //     [
  //       'table',
  //       [{
  //         config: {

  //         },
  //         runId: run.run!.id,
  //         runName: run.run!.name
  //       } as TaggedViewerConfig],
  //     ],
  //     [
  //       'tensorboard',
  //       [{
  //         config: { type: 'tensorboard', url: 'gs://path' },
  //         runId: run.run!.id,
  //         runName: run.run!.name
  //       } as TaggedViewerConfig]
  //     ],
  //   ]);
  //   tree.update();
  //   expect((tree.state('viewersMap') as Map<PlotType, TaggedViewerConfig>))
  //     .toEqual(expectedViewerMap);
  // });

  // it('uses the experiment ID in props as the page title if the experiment has no name', async () => {
  //   const experiment = newMockExperiment();
  //   experiment.name = '';

  //   const props = generateProps();
  //   props.match = { params: { [RouteParams.experimentId]: 'test exp ID' } } as any;

  //   getExperimentSpy.mockImplementationOnce(() => experiment);

  //   tree = shallow(<Compare {...props} />);
  //   await TestUtils.flushPromises();
  //   expect(updateToolbarSpy).toHaveBeenLastCalledWith(expect.objectContaining({
  //     pageTitle: 'test exp ID',
  //     pageTitleTooltip: 'test exp ID'
  //   }));
  // });

  // it('uses the experiment name as the page title', async () => {
  //   const experiment = newMockExperiment();
  //   experiment.name = 'A Test Experiment';

  //   getExperimentSpy.mockImplementationOnce(() => experiment);

  //   tree = shallow(<Compare {...generateProps()} />);
  //   await TestUtils.flushPromises();
  //   expect(updateToolbarSpy).toHaveBeenLastCalledWith(expect.objectContaining({
  //     pageTitle: 'A Test Experiment',
  //     pageTitleTooltip: 'A Test Experiment'
  //   }));
  // });

  // it('uses an empty string if the experiment has no description', async () => {
  //   const experiment = newMockExperiment();
  //   delete experiment.description;

  //   getExperimentSpy.mockImplementationOnce(() => experiment);

  //   tree = shallow(<Compare {...generateProps()} />);
  //   await TestUtils.flushPromises();
  //   expect(tree).toMatchSnapshot();
  // });

  // it('removes all description text after second newline and replaces with an ellipsis', async () => {
  //   const experiment = newMockExperiment();
  //   experiment.description = 'Line 1\nLine 2\nLine 3\nLine 4';

  //   getExperimentSpy.mockImplementationOnce(() => experiment);

  //   tree = shallow(<Compare {...generateProps()} />);
  //   await TestUtils.flushPromises();
  //   expect(tree).toMatchSnapshot();
  // });

  // it('opens the expanded description modal when the expand button is clicked', async () => {
  //   tree = TestUtils.mountWithRouter(<Compare {...generateProps() as any} />);
  //   await TestUtils.flushPromises();

  //   tree.update();

  //   tree.find('#expandExperimentDescriptionBtn').at(0).simulate('click');
  //   await TestUtils.flushPromises();
  //   expect(updateDialogSpy).toHaveBeenCalledWith({
  //     content: MOCK_EXPERIMENT.description,
  //     title: 'Experiment description',
  //   });
  // });

  // it('calls getExperiment with the experiment ID in props', async () => {
  //   const props = generateProps();
  //   props.match = { params: { eid: 'test exp ID' } } as any;
  //   tree = shallow(<Compare {...props} />);
  //   await TestUtils.flushPromises();
  //   expect(getExperimentSpy).toHaveBeenCalledTimes(1);
  //   expect(getExperimentSpy).toHaveBeenCalledWith('test exp ID');
  // });

  // it('shows an error banner if fetching the experiment fails', async () => {
  //   TestUtils.makeErrorResponseOnce(getExperimentSpy, 'test error');

  //   tree = shallow(<Compare {...generateProps()} />);
  //   await TestUtils.flushPromises();

  //   expect(updateBannerSpy).toHaveBeenLastCalledWith(expect.objectContaining({
  //     additionalInfo: 'test error',
  //     message: 'Error: failed to retrieve experiment: ' + MOCK_EXPERIMENT.id
  //       + '. Click Details for more information.',
  //     mode: 'error',
  //   }));
  //   expect(consoleErrorSpy.mock.calls[0][0]).toBe(
  //     'Error loading experiment: ' + MOCK_EXPERIMENT.id
  //   );
  // });

  // it('fetches this experiment\'s recurring runs', async () => {
  //   await mockNJobs(1);

  //   tree = shallow(<Compare {...generateProps()} />);
  //   await TestUtils.flushPromises();

  //   expect(listJobsSpy).toHaveBeenCalledTimes(1);
  //   expect(listJobsSpy).toHaveBeenLastCalledWith(
  //     undefined,
  //     100,
  //     '',
  //     ApiResourceType.EXPERIMENT.toString(),
  //     MOCK_EXPERIMENT.id,
  //   );
  //   expect(tree.state('activeRecurringRunsCount')).toBe(1);
  //   expect(tree).toMatchSnapshot();
  // });

  // it('shows an error banner if fetching the experiment\'s recurring runs fails', async () => {
  //   TestUtils.makeErrorResponseOnce(listJobsSpy, 'test error');

  //   tree = shallow(<Compare {...generateProps()} />);
  //   await TestUtils.flushPromises();

  //   expect(updateBannerSpy).toHaveBeenLastCalledWith(expect.objectContaining({
  //     additionalInfo: 'test error',
  //     message: 'Error: failed to retrieve recurring runs for experiment: ' + MOCK_EXPERIMENT.id
  //       + '. Click Details for more information.',
  //     mode: 'error',
  //   }));
  //   expect(consoleErrorSpy.mock.calls[0][0]).toBe(
  //     'Error fetching recurring runs for experiment: ' + MOCK_EXPERIMENT.id
  //   );
  // });

  // it('only counts enabled recurring runs as active', async () => {
  //   const jobs = [
  //     { id: 'enabled-job-1-id', enabled: true, name: 'enabled-job-1' },
  //     { id: 'enabled-job-2-id', enabled: true, name: 'enabled-job-2' },
  //     { id: 'disabled-job-1-id', enabled: false, name: 'disabled-job-1' },
  //   ];
  //   listJobsSpy.mockImplementationOnce(() => ({ jobs }));
  //   await listJobsSpy;

  //   tree = shallow(<Compare {...generateProps()} />);
  //   await TestUtils.flushPromises();

  //   expect(tree.state('activeRecurringRunsCount')).toBe(2);
  // });

  // it('opens the recurring run manager modal when \'manage\' is clicked', async () => {
  //   await mockNJobs(1);
  //   tree = TestUtils.mountWithRouter(<Compare {...generateProps() as any} />);
  //   await TestUtils.flushPromises();

  //   tree.update();

  //   tree.find('#manageExperimentRecurringRunsBtn').at(0).simulate('click');
  //   await TestUtils.flushPromises();
  //   expect(tree.state('recurringRunsManagerOpen')).toBe(true);
  // });

  // it('closes the recurring run manager modal', async () => {
  //   await mockNJobs(1);
  //   tree = TestUtils.mountWithRouter(<Compare {...generateProps() as any} />);
  //   await TestUtils.flushPromises();

  //   tree.update();

  //   tree.find('#manageExperimentRecurringRunsBtn').at(0).simulate('click');
  //   await TestUtils.flushPromises();
  //   expect(tree.state('recurringRunsManagerOpen')).toBe(true);

  //   tree.find('#closeExperimentRecurringRunManagerBtn').at(0).simulate('click');
  //   await TestUtils.flushPromises();
  //   expect(tree.state('recurringRunsManagerOpen')).toBe(false);

  // });

  // it('refreshes the number of active recurring runs when the recurring run manager is closed', async () => {
  //   await mockNJobs(1);
  //   tree = TestUtils.mountWithRouter(<Compare {...generateProps() as any} />);
  //   await TestUtils.flushPromises();

  //   tree.update();

  //   // Called when the page initially loads to display the number of active recurring runs
  //   expect(listJobsSpy).toHaveBeenCalledTimes(1);

  //   tree.find('#manageExperimentRecurringRunsBtn').at(0).simulate('click');
  //   await TestUtils.flushPromises();
  //   expect(tree.state('recurringRunsManagerOpen')).toBe(true);

  //   // Called in the recurring run manager to list the recurring runs
  //   expect(listJobsSpy).toHaveBeenCalledTimes(2);

  //   tree.find('#closeExperimentRecurringRunManagerBtn').at(0).simulate('click');
  //   await TestUtils.flushPromises();
  //   expect(tree.state('recurringRunsManagerOpen')).toBe(false);

  //   // Called a third time when the manager is closed to update the number of active recurring runs
  //   expect(listJobsSpy).toHaveBeenCalledTimes(3);

  // });

  // it('clears the error banner on refresh', async () => {
  //   TestUtils.makeErrorResponseOnce(getExperimentSpy, 'test error');

  //   tree = shallow(<Compare {...generateProps()} />);
  //   await TestUtils.flushPromises();

  //   // Verify that error banner is being shown
  //   expect(updateBannerSpy).toHaveBeenLastCalledWith(expect.objectContaining({ mode: 'error' }));

  //   (tree.instance() as Compare).refresh();

  //   // Error banner should be cleared
  //   expect(updateBannerSpy).toHaveBeenLastCalledWith({});

  // });

  // it('navigates to the compare runs page', async () => {
  //   const runs = [
  //     { id: 'run-1-id', name: 'run-1' },
  //     { id: 'run-2-id', name: 'run-2' },
  //   ];
  //   listRunsSpy.mockImplementationOnce(() => ({ runs }));
  //   await listRunsSpy;

  //   tree = TestUtils.mountWithRouter(<Compare {...generateProps()} />);
  //   await TestUtils.flushPromises();
  //   tree.update();

  //   tree.find('.tableRow').at(0).simulate('click');
  //   tree.find('.tableRow').at(1).simulate('click');

  //   const compareBtn = (tree.state('runListToolbarProps') as ToolbarProps)
  //     .actions.find(b => b.title === 'Compare runs');
  //   await compareBtn!.action();

  //   expect(historyPushSpy).toHaveBeenCalledWith(
  //     RoutePage.COMPARE + `?${QUERY_PARAMS.runlist}=run-1-id,run-2-id`);
  // });

  // it('navigates to the new run page and passes this experiment\s ID as a query param', async () => {
  //   tree = shallow(<Compare {...generateProps()} />);
  //   await TestUtils.flushPromises();
  //   tree.update();

  //   const newRunBtn = (tree.state('runListToolbarProps') as ToolbarProps)
  //     .actions.find(b => b.title === 'Create run');
  //   await newRunBtn!.action();

  //   expect(historyPushSpy).toHaveBeenCalledWith(
  //     RoutePage.NEW_RUN + `?${QUERY_PARAMS.experimentId}=${MOCK_EXPERIMENT.id}`);
  // });

  // it('navigates to the new run page with query param indicating it will be a recurring run', async () => {
  //   tree = shallow(<Compare {...generateProps()} />);
  //   await TestUtils.flushPromises();
  //   tree.update();

  //   const newRecurringRunBtn = (tree.state('runListToolbarProps') as ToolbarProps)
  //     .actions.find(b => b.title === 'Create recurring run');
  //   await newRecurringRunBtn!.action();

  //   expect(historyPushSpy).toHaveBeenCalledWith(
  //     RoutePage.NEW_RUN
  //     + `?${QUERY_PARAMS.experimentId}=${MOCK_EXPERIMENT.id}`
  //     + `&${QUERY_PARAMS.isRecurring}=1`);
  // });

  // it('supports cloning a selected run', async () => {
  //   const runs = [{ id: 'run-1-id', name: 'run-1' }];
  //   listRunsSpy.mockImplementationOnce(() => ({ runs }));
  //   await listRunsSpy;

  //   tree = TestUtils.mountWithRouter(<Compare {...generateProps()} />);
  //   await TestUtils.flushPromises();
  //   tree.update();

  //   // Select the run to clone
  //   tree.find('.tableRow').simulate('click');

  //   const cloneBtn = (tree.state('runListToolbarProps') as ToolbarProps)
  //     .actions.find(b => b.title === 'Clone');
  //   await cloneBtn!.action();

  //   expect(historyPushSpy).toHaveBeenCalledWith(
  //     RoutePage.NEW_RUN + `?${QUERY_PARAMS.cloneFromRun}=run-1-id`);
  // });

  // it('enables the compare runs button only when between 2 and 10 runs are selected', async () => {
  //   await mockNRuns(12);

  //   tree = TestUtils.mountWithRouter(<Compare {...generateProps()} />);
  //   await TestUtils.flushPromises();
  //   tree.update();

  //   const compareBtn = (tree.state('runListToolbarProps') as ToolbarProps)
  //     .actions.find(b => b.title === 'Compare runs');

  //   for (let i = 0; i < 12; i++) {
  //     if (i < 2 || i > 10) {
  //       expect(compareBtn!.disabled).toBe(true);
  //     } else {
  //       expect(compareBtn!.disabled).toBe(false);
  //     }
  //     tree.find('.tableRow').at(i).simulate('click');
  //   }
  // });

  // it('enables the clone run button only when 1 run is selected', async () => {
  //   await mockNRuns(4);

  //   tree = TestUtils.mountWithRouter(<Compare {...generateProps()} />);
  //   await TestUtils.flushPromises();
  //   tree.update();

  //   const cloneBtn = (tree.state('runListToolbarProps') as ToolbarProps)
  //     .actions.find(b => b.title === 'Clone');

  //   for (let i = 0; i < 4; i++) {
  //     if (i === 1) {
  //       expect(cloneBtn!.disabled).toBe(false);
  //     } else {
  //       expect(cloneBtn!.disabled).toBe(true);
  //     }
  //     tree.find('.tableRow').at(i).simulate('click');
  //   }
  // });
});
