use bevy::prelude::*;

// =========================================================================
// 1. 定義定義組件 (Components)
// =========================================================================

#[derive(Component)]
struct Player;

#[derive(Component)]
struct Velocity(Vec3);

#[derive(Component)]
struct Bullet;

// =========================================================================
// 2. 遊戲初始化系統 (Setup System)
// =========================================================================

fn setup(mut commands: Commands, asset_server: Res<AssetServer>) {
    // 2D 遊戲必須先生成一個 2D 攝影機
    commands.spawn(Camera2dBundle::default());

    // 生成玩家飛船
    commands.spawn((
        SpriteBundle {
            // 自動載入預設的圖形（這裡用一個內建的白色方形代替，你也可以換成自己的圖片路徑）
            sprite: Sprite {
                color: Color::rgb(0.3, 0.8, 0.3), // 綠色飛船
                custom_size: Some(Vec2::new(50.0, 30.0)),
                ..default()
            },
            transform: Transform::from_xyz(0.0, -200.0, 0.0), // 初始位置在螢幕下方
            ..default()
        },
        Player, // 標記為玩家
    ));
}

// =========================================================================
// 3. 遊戲邏輯系統 (Systems)
// =========================================================================

// 玩家移動控制系統
fn player_control_system(
    keyboard_input: Res<ButtonInput<KeyCode>>,
    mut query: Query<&mut Transform, With<Player>>,
    time: Res<Time>,
) {
    if let Ok(mut transform) = query.get_single_mut() {
        let mut direction = 0.0;
        
        if keyboard_input.pressed(KeyCode::ArrowLeft) || keyboard_input.pressed(KeyCode::KeyA) {
            direction -= 1.0;
        }
        if keyboard_input.pressed(KeyCode::ArrowRight) || keyboard_input.pressed(KeyCode::KeyD) {
            direction += 1.0;
        }

        // 根據每秒幀數 (Delta Time) 計算平滑位移，防止速度受 FPS 影響
        let speed = 400.0;
        transform.translation.x += direction * speed * time.delta_seconds();
    }
}

// 玩家射擊系統
fn player_shoot_system(
    mut commands: Commands,
    keyboard_input: Res<ButtonInput<KeyCode>>,
    query: Query<&Transform, With<Player>>,
) {
    if keyboard_input.just_pressed(KeyCode::Space) {
        if let Ok(player_transform) = query.get_single() {
            // 在玩家目前的位置生成一顆子彈
            commands.spawn((
                SpriteBundle {
                    sprite: Sprite {
                        color: Color::rgb(1.0, 0.2, 0.2), // 紅色子彈
                        custom_size: Some(Vec2::new(8.0, 20.0)),
                        ..default()
                    },
                    transform: Transform::from_translation(player_transform.translation),
                    ..default()
                },
                Bullet,
                Velocity(Vec3::new(0.0, 600.0, 0.0)), // 子彈向上飛的速度
            ));
        }
    }
}

// 子彈飛行與移動運動系統
fn movement_system(
    mut query: Query<(&mut Transform, &Velocity)>, 
    time: Res<Time>
) {
    for (mut transform, velocity) in &mut query {
        transform.translation += velocity.0 * time.delta_seconds();
    }
}

// 超出螢幕的子彈自動回收系統（防記憶體洩漏）
fn cleanup_system(
    mut commands: Commands, 
    query: Query<(Entity, &Transform), With<Bullet>>
) {
    for (entity, transform) in &query {
        if transform.translation.y > 400.0 { // 超出螢幕上方
            commands.entity(entity).despawn();
            println!("子彈已回收，釋放記憶體。");
        }
    }
}

// =========================================================================
// 4. 主程式入口
// =========================================================================

fn main() {
    App::new()
        // 載入 Bevy 的預設外掛（包含視窗管理、輸入系統、渲染引擎等）
        .add_plugins(DefaultPlugins.set(WindowPlugin {
            primary_window: Some(Window {
                title: "Rust 宇宙大戰 (Bevy Engine)".to_string(),
                resolution: (800.0, 600.0).into(),
                ..default()
            }),
            ..default()
        }))
        // 註冊初始化系統 (只執行一次)
        .add_systems(Startup, setup)
        // 註冊遊戲主循環系統 (每幀都會執行)
        .add_systems(Update, (
            player_control_system,
            player_shoot_system,
            movement_system,
            cleanup_system
        ))
        .run();
}