import SwiftUI

struct ProfileView: View {
    @ObservedObject var viewModel: ExplorerViewModel

    var body: some View {
        VStack {
            Text("ProfileView")
        }
    }
}

#Preview {
    ProfileView(viewModel: ExplorerViewModel())
}

