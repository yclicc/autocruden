(module
  ;; Import memory from JavaScript
  (import "env" "memory" (memory 1))
  
  ;; Import progress callback function from JavaScript
  (import "env" "progress_callback" (func $progress_callback (param i32)))
  
  ;; Export functions
  (export "dot_product" (func $dot_product))
  (export "dot_product_batch" (func $dot_product_batch))
  (export "dot_product_batch_with_progress" (func $dot_product_batch_with_progress))
  (export "similarity_matrix" (func $similarity_matrix))
  (export "similarity_matrix_with_progress" (func $similarity_matrix_with_progress))
  
  ;; Single dot product: compute dot product between two vectors
  ;; Parameters: vec1_ptr, vec2_ptr, dimension
  ;; Returns: dot product as f32
  (func $dot_product (param $vec1_ptr i32) (param $vec2_ptr i32) (param $dimension i32) (result f32)
    (local $i i32)
    (local $sum f32)
    (local $val1 f32)
    (local $val2 f32)
    
    (local.set $i (i32.const 0))
    (local.set $sum (f32.const 0.0))
    
    (loop $loop
      ;; Load values from memory
      (local.set $val1 (f32.load (i32.add (local.get $vec1_ptr) (i32.mul (local.get $i) (i32.const 4)))))
      (local.set $val2 (f32.load (i32.add (local.get $vec2_ptr) (i32.mul (local.get $i) (i32.const 4)))))
      
      ;; Multiply and add to sum
      (local.set $sum (f32.add (local.get $sum) (f32.mul (local.get $val1) (local.get $val2))))
      
      ;; Increment counter
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      
      ;; Continue loop if i < dimension
      (br_if $loop (i32.lt_u (local.get $i) (local.get $dimension)))
    )
    
    (local.get $sum)
  )
  
  ;; Batch dot products: compute dot products between one vector and many vectors
  ;; Parameters: query_ptr, matrix_ptr, num_vectors, dimension, results_ptr
  (func $dot_product_batch (param $query_ptr i32) (param $matrix_ptr i32) (param $num_vectors i32) (param $dimension i32) (param $results_ptr i32)
    (local $i i32)
    (local $current_vec_ptr i32)
    (local $result f32)
    (local $vector_size i32)
    
    ;; Calculate size of one vector in bytes (dimension * 4 bytes per f32)
    (local.set $vector_size (i32.mul (local.get $dimension) (i32.const 4)))
    (local.set $i (i32.const 0))
    
    (loop $batch_loop
      ;; Calculate pointer to current vector in matrix
      (local.set $current_vec_ptr (i32.add (local.get $matrix_ptr) (i32.mul (local.get $i) (local.get $vector_size))))
      
      ;; Compute dot product
      (local.set $result (call $dot_product (local.get $query_ptr) (local.get $current_vec_ptr) (local.get $dimension)))
      
      ;; Store result
      (f32.store (i32.add (local.get $results_ptr) (i32.mul (local.get $i) (i32.const 4))) (local.get $result))
      
      ;; Increment counter
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      
      ;; Continue loop if i < num_vectors
      (br_if $batch_loop (i32.lt_u (local.get $i) (local.get $num_vectors)))
    )
  )
  
  ;; Optimized similarity matrix calculation using symmetry
  ;; Parameters: matrix_ptr, num_vectors, dimension, results_ptr
  (func $similarity_matrix (param $matrix_ptr i32) (param $num_vectors i32) (param $dimension i32) (param $results_ptr i32)
    (local $i i32)
    (local $j i32)
    (local $vec1_ptr i32)
    (local $vec2_ptr i32)
    (local $result f32)
    (local $vector_size i32)
    (local $result_offset i32)
    (local $symmetric_offset i32)
    
    ;; Calculate size of one vector in bytes
    (local.set $vector_size (i32.mul (local.get $dimension) (i32.const 4)))
    (local.set $i (i32.const 0))
    
    (loop $outer_loop
      (local.set $j (local.get $i)) ;; Start j from i to only compute upper triangle + diagonal
      
      (loop $inner_loop
        ;; Calculate pointers to vectors
        (local.set $vec1_ptr (i32.add (local.get $matrix_ptr) (i32.mul (local.get $i) (local.get $vector_size))))
        (local.set $vec2_ptr (i32.add (local.get $matrix_ptr) (i32.mul (local.get $j) (local.get $vector_size))))
        
        ;; Compute dot product
        (local.set $result (call $dot_product (local.get $vec1_ptr) (local.get $vec2_ptr) (local.get $dimension)))
        
        ;; Calculate result matrix offset for [i][j]
        (local.set $result_offset (i32.add (local.get $results_ptr) 
                                          (i32.mul (i32.add (i32.mul (local.get $i) (local.get $num_vectors)) (local.get $j)) 
                                                   (i32.const 4))))
        
        ;; Store result at [i][j]
        (f32.store (local.get $result_offset) (local.get $result))
        
        ;; Store symmetric result at [j][i] if i != j
        (if (i32.ne (local.get $i) (local.get $j))
          (then
            (local.set $symmetric_offset (i32.add (local.get $results_ptr)
                                                 (i32.mul (i32.add (i32.mul (local.get $j) (local.get $num_vectors)) (local.get $i))
                                                          (i32.const 4))))
            (f32.store (local.get $symmetric_offset) (local.get $result))
          )
        )
        
        ;; Increment j
        (local.set $j (i32.add (local.get $j) (i32.const 1)))
        
        ;; Continue inner loop if j < num_vectors
        (br_if $inner_loop (i32.lt_u (local.get $j) (local.get $num_vectors)))
      )
      
      ;; Increment i
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      
      ;; Continue outer loop if i < num_vectors
      (br_if $outer_loop (i32.lt_u (local.get $i) (local.get $num_vectors)))
    )
  )

  ;; Batch dot products with progress reporting
  ;; Parameters: query_ptr, matrix_ptr, num_vectors, dimension, results_ptr, progress_interval
  (func $dot_product_batch_with_progress (param $query_ptr i32) (param $matrix_ptr i32) (param $num_vectors i32) (param $dimension i32) (param $results_ptr i32) (param $progress_interval i32)
    (local $i i32)
    (local $current_vec_ptr i32)
    (local $result f32)
    (local $vector_size i32)
    
    ;; Calculate size of one vector in bytes (dimension * 4 bytes per f32)
    (local.set $vector_size (i32.mul (local.get $dimension) (i32.const 4)))
    (local.set $i (i32.const 0))
    
    (loop $batch_loop
      ;; Calculate pointer to current vector in matrix
      (local.set $current_vec_ptr (i32.add (local.get $matrix_ptr) (i32.mul (local.get $i) (local.get $vector_size))))
      
      ;; Compute dot product
      (local.set $result (call $dot_product (local.get $query_ptr) (local.get $current_vec_ptr) (local.get $dimension)))
      
      ;; Store result
      (f32.store (i32.add (local.get $results_ptr) (i32.mul (local.get $i) (i32.const 4))) (local.get $result))
      
      ;; Check if we should report progress
      (if (i32.eq (i32.rem_u (local.get $i) (local.get $progress_interval)) (i32.const 0))
        (then
          ;; Call progress callback with current index
          (call $progress_callback (local.get $i))
        )
      )
      
      ;; Increment counter
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      
      ;; Continue loop if i < num_vectors
      (br_if $batch_loop (i32.lt_u (local.get $i) (local.get $num_vectors)))
    )
    
    ;; Final progress callback
    (call $progress_callback (local.get $num_vectors))
  )
  
  ;; Similarity matrix calculation with progress reporting
  ;; Parameters: matrix_ptr, num_vectors, dimension, results_ptr, progress_interval
  (func $similarity_matrix_with_progress (param $matrix_ptr i32) (param $num_vectors i32) (param $dimension i32) (param $results_ptr i32) (param $progress_interval i32)
    (local $i i32)
    (local $j i32)
    (local $vec1_ptr i32)
    (local $vec2_ptr i32)
    (local $result f32)
    (local $vector_size i32)
    (local $result_offset i32)
    (local $symmetric_offset i32)
    (local $completed i32)
    
    ;; Calculate size of one vector in bytes
    (local.set $vector_size (i32.mul (local.get $dimension) (i32.const 4)))
    (local.set $i (i32.const 0))
    (local.set $completed (i32.const 0))
    
    (loop $outer_loop
      (local.set $j (local.get $i)) ;; Start j from i to only compute upper triangle + diagonal
      
      (loop $inner_loop
        ;; Calculate pointers to vectors
        (local.set $vec1_ptr (i32.add (local.get $matrix_ptr) (i32.mul (local.get $i) (local.get $vector_size))))
        (local.set $vec2_ptr (i32.add (local.get $matrix_ptr) (i32.mul (local.get $j) (local.get $vector_size))))
        
        ;; Compute dot product
        (local.set $result (call $dot_product (local.get $vec1_ptr) (local.get $vec2_ptr) (local.get $dimension)))
        
        ;; Calculate result matrix offset for [i][j]
        (local.set $result_offset (i32.add (local.get $results_ptr) 
                                          (i32.mul (i32.add (i32.mul (local.get $i) (local.get $num_vectors)) (local.get $j)) 
                                                   (i32.const 4))))
        
        ;; Store result at [i][j]
        (f32.store (local.get $result_offset) (local.get $result))
        
        ;; Store symmetric result at [j][i] if i != j
        (if (i32.ne (local.get $i) (local.get $j))
          (then
            (local.set $symmetric_offset (i32.add (local.get $results_ptr)
                                                 (i32.mul (i32.add (i32.mul (local.get $j) (local.get $num_vectors)) (local.get $i))
                                                          (i32.const 4))))
            (f32.store (local.get $symmetric_offset) (local.get $result))
          )
        )
        
        ;; Increment completed counter
        (local.set $completed (i32.add (local.get $completed) (i32.const 1)))
        
        ;; Check if we should report progress
        (if (i32.eq (i32.rem_u (local.get $completed) (local.get $progress_interval)) (i32.const 0))
          (then
            ;; Call progress callback with completed count
            (call $progress_callback (local.get $completed))
          )
        )
        
        ;; Increment j
        (local.set $j (i32.add (local.get $j) (i32.const 1)))
        
        ;; Continue inner loop if j < num_vectors
        (br_if $inner_loop (i32.lt_u (local.get $j) (local.get $num_vectors)))
      )
      
      ;; Increment i
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      
      ;; Continue outer loop if i < num_vectors
      (br_if $outer_loop (i32.lt_u (local.get $i) (local.get $num_vectors)))
    )
    
    ;; Final progress callback with total completed
    (call $progress_callback (local.get $completed))
  )
)