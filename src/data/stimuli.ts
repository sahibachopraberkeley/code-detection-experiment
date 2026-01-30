export interface Stimulus {
  id: string;
  context: string;
  humanCode: string;
  aiCode: string;
}

export const stimuli: Stimulus[] = [
  {
    id: "drake_check_satisfied",
    context: "A test function that verifies whether mathematical constraints in an optimization program are satisfied. It checks both individual constraints and multiple constraints together.",
    humanCode: `def test_prog_check_satisfied(self):
    prog = mp.MathematicalProgram()
    x = prog.NewContinuousVariables(3)
    binding1 = prog.AddBoundingBoxConstraint(-1, 1, x[0])
    binding2 = prog.AddLinearConstraint(x[1]+x[2] <= 2.0)
    x_val = np.array([-2, .1, .3])
    self.assertTrue(
        prog.CheckSatisfied(binding=binding2, prog_var_vals=x_val,
                            tol=0.0))
    self.assertFalse(
        prog.CheckSatisfied(bindings=[binding1, binding2],
                            prog_var_vals=x_val,
                            tol=0.0))
    prog.SetInitialGuessForAllVariables(x_val)
    self.assertTrue(
        prog.CheckSatisfiedAtInitialGuess(binding=binding2, tol=0.0))
    self.assertFalse(
        prog.CheckSatisfiedAtInitialGuess(
            bindings=[binding1, binding2], tol=0.0))`,
    aiCode: `def test_prog_check_satisfied(self):
    """Test the CheckSatisfied and CheckSatisfiedAtInitialGuess methods.
    
    This test verifies that:
    1. CheckSatisfied correctly evaluates individual constraint bindings
    2. CheckSatisfied correctly evaluates multiple constraint bindings
    3. CheckSatisfiedAtInitialGuess works with pre-set initial guess values
    """
    # Initialize the mathematical program
    prog = mp.MathematicalProgram()
    
    # Create continuous decision variables
    x = prog.NewContinuousVariables(3)
    
    # Add constraints to the program
    bounding_box_constraint = prog.AddBoundingBoxConstraint(-1, 1, x[0])
    linear_constraint = prog.AddLinearConstraint(x[1] + x[2] <= 2.0)
    
    # Define test values (note: x[0] = -2 violates the bounding box constraint)
    test_values = np.array([-2.0, 0.1, 0.3])
    
    # Test CheckSatisfied with a single binding that should be satisfied
    self.assertTrue(
        prog.CheckSatisfied(
            binding=linear_constraint,
            prog_var_vals=test_values,
            tol=0.0
        )
    )
    
    # Test CheckSatisfied with multiple bindings (should fail due to bounding box)
    self.assertFalse(
        prog.CheckSatisfied(
            bindings=[bounding_box_constraint, linear_constraint],
            prog_var_vals=test_values,
            tol=0.0
        )
    )
    
    # Set initial guess and test CheckSatisfiedAtInitialGuess
    prog.SetInitialGuessForAllVariables(test_values)
    
    # Single binding check at initial guess
    self.assertTrue(
        prog.CheckSatisfiedAtInitialGuess(binding=linear_constraint, tol=0.0)
    )
    
    # Multiple bindings check at initial guess
    self.assertFalse(
        prog.CheckSatisfiedAtInitialGuess(
            bindings=[bounding_box_constraint, linear_constraint],
            tol=0.0
        )
    )`
  },
  {
    id: "drake_lmi",
    context: "A test function that adds a Linear Matrix Inequality constraint to a mathematical optimization program and verifies the constraint properties are correctly stored.",
    humanCode: `def test_add_linear_matrix_inequality_constraint(self):
    prog = mp.MathematicalProgram()
    F = [np.eye(2), np.array([[0, 1], [1., 0.]])]
    x = prog.NewContinuousVariables(1)
    cnstr = prog.AddLinearMatrixInequalityConstraint(F=F, vars=x)
    self.assertIsInstance(
        cnstr.evaluator(), mp.LinearMatrixInequalityConstraint)
    self.assertEqual(cnstr.evaluator().matrix_rows(), 2)
    self.assertEqual(len(cnstr.evaluator().F()), 2)
    np.testing.assert_array_equal(cnstr.evaluator().F()[0], F[0])
    np.testing.assert_array_equal(cnstr.evaluator().F()[1], F[1])`,
    aiCode: `def test_add_linear_matrix_inequality_constraint(self):
    """Test adding a Linear Matrix Inequality (LMI) constraint to a program.
    
    This test verifies that:
    1. The constraint can be successfully added to a MathematicalProgram
    2. The evaluator returns the correct type
    3. The matrix dimensions are preserved correctly
    4. The coefficient matrices F are stored and retrievable
    """
    # Initialize the mathematical program
    prog = mp.MathematicalProgram()
    
    # Define the symmetric coefficient matrices for the LMI constraint
    # F[0] + x[0] * F[1] >= 0 (positive semidefinite)
    identity_matrix = np.eye(2)
    symmetric_matrix = np.array([[0.0, 1.0], [1.0, 0.0]])
    coefficient_matrices = [identity_matrix, symmetric_matrix]
    
    # Create decision variables
    x = prog.NewContinuousVariables(1)
    
    # Add the LMI constraint to the program
    constraint_binding = prog.AddLinearMatrixInequalityConstraint(
        F=coefficient_matrices, 
        vars=x
    )
    
    # Verify the constraint evaluator type
    constraint_evaluator = constraint_binding.evaluator()
    self.assertIsInstance(
        constraint_evaluator, 
        mp.LinearMatrixInequalityConstraint
    )
    
    # Verify matrix dimensions
    self.assertEqual(constraint_evaluator.matrix_rows(), 2)
    
    # Verify the number of coefficient matrices
    self.assertEqual(len(constraint_evaluator.F()), 2)
    
    # Verify the coefficient matrices are stored correctly
    np.testing.assert_array_equal(
        constraint_evaluator.F()[0], 
        coefficient_matrices[0]
    )
    np.testing.assert_array_equal(
        constraint_evaluator.F()[1], 
        coefficient_matrices[1]
    )`
  },
  {
    id: "responses_passthrough",
    context: "A test function that verifies HTTP response mocking behavior. When passthrough is enabled, requests go to the real server; when disabled, they return mocked responses.",
    humanCode: `def test_passthrough_kwarg(httpserver):
    httpserver.serve_content("OK", headers={"Content-Type": "text/plain"})

    def configure_response(passthrough):
        responses.get(httpserver.url, body="MOCK", passthrough=passthrough)

    @responses.activate
    def run_passthrough():
        configure_response(passthrough=True)
        resp = requests.get(httpserver.url)
        assert_response(resp, "OK")

    @responses.activate
    def run_mocked():
        configure_response(passthrough=False)
        resp = requests.get(httpserver.url)
        assert_response(resp, "MOCK")

    run_mocked()
    assert_reset()

    run_passthrough()
    assert_reset()`,
    aiCode: `def test_passthrough_kwarg(httpserver):
    """Test that the passthrough keyword argument correctly controls response behavior.
    
    This test verifies that:
    - When passthrough=True, requests are forwarded to the actual server
    - When passthrough=False, requests return the mocked response
    
    Args:
        httpserver: pytest-localserver fixture providing a test HTTP server
    """
    # Configure the test server to return "OK"
    httpserver.serve_content("OK", headers={"Content-Type": "text/plain"})

    def configure_mock_response(passthrough: bool) -> None:
        """Configure a mock response with the specified passthrough setting.
        
        Args:
            passthrough: If True, forward to real server. If False, return mock.
        """
        responses.get(httpserver.url, body="MOCK", passthrough=passthrough)

    @responses.activate
    def test_with_passthrough_enabled():
        """Test that passthrough=True forwards to the real server."""
        configure_mock_response(passthrough=True)
        response = requests.get(httpserver.url)
        assert_response(response, "OK")

    @responses.activate
    def test_with_passthrough_disabled():
        """Test that passthrough=False returns the mocked response."""
        configure_mock_response(passthrough=False)
        response = requests.get(httpserver.url)
        assert_response(response, "MOCK")

    # Run test with mocking enabled first
    test_with_passthrough_disabled()
    assert_reset()

    # Run test with passthrough enabled
    test_with_passthrough_enabled()
    assert_reset()`
  },
  {
    id: "dask_iterables",
    context: "A test function that verifies a data processing function can handle different types of iterables as input, including enumerate objects, tuples, and generators.",
    humanCode: `def _generator():
    # Simple generator for test_from_map_other_iterables
    yield from enumerate(["A", "B", "C"])


@pytest.mark.parametrize(
    "iterable",
    [
        enumerate(["A", "B", "C"]),
        ((0, "A"), (1, "B"), (2, "C")),
        _generator(),
    ],
)
def test_from_map_other_iterables(iterable):
    # Test that iterable arguments to \`from_map\`
    # can be enumerate and generator
    # See: https://github.com/dask/dask/issues/9064

    def func(t):
        size = t[0] + 1
        x = t[1]
        return pd.Series([x] * size)

    ddf = dd.from_map(func, iterable)
    expect = pd.Series(
        ["A", "B", "B", "C", "C", "C"],
        index=[0, 0, 1, 0, 1, 2],
    )
    assert_eq(ddf.compute(), expect)`,
    aiCode: `def _create_test_generator():
    """Create a generator that yields enumerated tuples for testing.
    
    Yields:
        Tuple[int, str]: Index-value pairs (0, "A"), (1, "B"), (2, "C")
    """
    yield from enumerate(["A", "B", "C"])


@pytest.mark.parametrize(
    "iterable",
    [
        enumerate(["A", "B", "C"]),
        ((0, "A"), (1, "B"), (2, "C")),
        _create_test_generator(),
    ],
    ids=["enumerate", "tuple_of_tuples", "generator"]
)
def test_from_map_other_iterables(iterable):
    """Test that from_map correctly handles various iterable input types.
    
    This test verifies that the from_map function can process:
    - enumerate objects
    - Tuple iterables
    - Generator functions
    
    The test ensures that non-list iterables are properly converted
    and processed without errors.
    
    Args:
        iterable: The iterable input to test with from_map
        
    See Also:
        GitHub Issue: https://github.com/dask/dask/issues/9064
    """
    def transform_tuple_to_series(tuple_input):
        """Transform an index-value tuple into a pandas Series.
        
        Args:
            tuple_input: A tuple of (index, value)
            
        Returns:
            pd.Series: A series with the value repeated (index + 1) times
        """
        repetition_count = tuple_input[0] + 1
        value = tuple_input[1]
        return pd.Series([value] * repetition_count)

    # Apply the transformation using from_map
    dask_dataframe = dd.from_map(transform_tuple_to_series, iterable)
    
    # Define the expected output
    expected_series = pd.Series(
        ["A", "B", "B", "C", "C", "C"],
        index=[0, 0, 1, 0, 1, 2],
    )
    
    # Verify the computed result matches expected output
    assert_eq(dask_dataframe.compute(), expected_series)`
  },
  {
    id: "aiida_label",
    context: "A property getter and setter that manages code labels in a workflow system. The setter validates that labels don't contain the '@' symbol, which is reserved for internal use.",
    humanCode: `@property
def label(self):
    """Return the node label.

    :return: the label
    """
    return super().label

@label.setter
def label(self, value):
    """Set the label.

    :param value: the new value to set
    """
    if '@' in str(value):
        msg = "Code labels must not contain the '@' symbol"
        raise InputValidationError(msg)

    super(Code, self.__class__).label.fset(self, value)`,
    aiCode: `@property
def label(self) -> str:
    """Return the node label.
    
    Returns:
        str: The current label of the code node.
        
    Example:
        >>> code = Code()
        >>> code.label = "my_code"
        >>> print(code.label)
        'my_code'
    """
    return super().label

@label.setter
def label(self, value: str) -> None:
    """Set the label for this code node.
    
    The label is validated to ensure it does not contain the '@' symbol,
    which is reserved for the full_label format (label@computer_name).
    
    Args:
        value: The new label value to set.
        
    Raises:
        InputValidationError: If the label contains the '@' symbol.
        
    Example:
        >>> code = Code()
        >>> code.label = "valid_label"  # OK
        >>> code.label = "invalid@label"  # Raises InputValidationError
    """
    # Validate that the label does not contain the '@' symbol
    # The '@' is reserved for full_label format: "label@computer_name"
    label_string = str(value)
    if '@' in label_string:
        error_message = (
            "Code labels must not contain the '@' symbol. "
            "The '@' character is reserved for the full label format "
            "(label@computer_name)."
        )
        raise InputValidationError(error_message)

    # Call the parent class setter to actually set the label
    super(Code, self.__class__).label.fset(self, value)`
  }
];

// Practice trial stimulus (not included in analysis)
export const practiceStimulus: Stimulus = {
  id: "practice",
  context: "A simple utility function that calculates the average of a list of numbers, returning zero for empty lists.",
  humanCode: `def calc_avg(nums):
    if not nums:
        return 0
    return sum(nums) / len(nums)`,
  aiCode: `def calc_avg(nums):
    """Calculate the arithmetic average of a list of numbers.
    
    Args:
        nums: A list of numeric values.
        
    Returns:
        float: The arithmetic mean of the input values,
               or 0 if the list is empty.
    """
    # Handle empty list edge case
    if not nums:
        return 0
    
    # Calculate and return the average
    total = sum(nums)
    count = len(nums)
    return total / count`
};
