-- RPC to increment user behavior metrics
CREATE OR REPLACE FUNCTION increment_user_behavior(
  p_user_id UUID,
  p_query_length INT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO user_behavior (user_id, query_count, total_query_length, usage_score, last_active)
  VALUES (p_user_id, 1, p_query_length, 5, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    query_count = user_behavior.query_count + 1,
    total_query_length = user_behavior.total_query_length + p_query_length,
    usage_score = LEAST(100, user_behavior.usage_score + 2),
    last_active = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to increment user rejection metrics
CREATE OR REPLACE FUNCTION increment_user_rejection(
  p_user_id UUID
) RETURNS VOID AS $$
BEGIN
  INSERT INTO user_behavior (user_id, rejection_count, last_active)
  VALUES (p_user_id, 1, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    rejection_count = user_behavior.rejection_count + 1,
    last_active = NOW(),
    updated_at = NOW();
  
  -- Also update error_rate
  UPDATE user_behavior SET
    error_rate = CASE 
      WHEN query_count > 0 THEN rejection_count::FLOAT / query_count::FLOAT 
      ELSE 0 
    END
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
