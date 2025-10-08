-- 创建增加用户积分的RPC函数
CREATE OR REPLACE FUNCTION increment_user_points(user_id UUID, points_to_add INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_points INT;
  new_points INT;
  result JSONB;
BEGIN
  -- 获取当前积分
  SELECT points INTO current_points FROM profiles WHERE id = user_id;
  
  IF current_points IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- 计算新积分
  new_points := current_points + points_to_add;
  
  -- 更新积分
  UPDATE profiles 
  SET 
    points = new_points,
    updated_at = NOW()
  WHERE id = user_id;
  
  -- 返回结果
  RETURN jsonb_build_object(
    'success', true, 
    'previous_points', current_points, 
    'points_added', points_to_add, 
    'new_points', new_points
  );
END;
$$;